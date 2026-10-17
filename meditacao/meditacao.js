/* Tiny Cats · Meditação: a página.
   A cena é o lugar onde os personagens meditam (ambiente, hora, clima — ou uma imagem do mestre) e mostra, para todos,
   quem está meditando. Quem joga escreve a prática do personagem dele (objeto, mantra, representação, panteão — o mesmo
   da ficha —, a imagem meditando), entra e sai da meditação e, com a tentativa que o mestre libera, combina símbolos nos
   pilares: se a combinação é uma das receitas do mestre, descobre o efeito dela. Quem mestra a Meditação monta o lugar,
   chama e tira quem medita, libera as tentativas, enche as barras de treinamento (só ele as vê) e escreve as receitas e
   os símbolos.
   Entrar, liberar e tentar passam pelo banco (supabase/migrations/0017_meditacao.sql): é lá que a combinação é
   conferida, nas receitas que o jogador não lê. Fora de uma mesa (a página sozinha), tudo fica neste navegador e a
   página faz o mesmo que o banco, com um personagem de teste. */
(() => {
  'use strict';
  const N = window.MeditacaoNucleo, DES = window.MeditacaoDesenhos, JN = window.JornalNucleo || null;
  const DEBUG = /[?&]debug\b/.test(location.search);
  const $ = id => document.getElementById(id);
  const j = JSON.stringify;
  const copia = x => (x == null ? x : JSON.parse(JSON.stringify(x)));
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    let valor;
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el[k] = v;
      else if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'value') valor = v;
      else if (k === 'checked') el.checked = true;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c);
    if (valor !== undefined) el.value = valor;
    return el;
  }
  const NS = 'http://www.w3.org/2000/svg';
  function svg(tam, conteudo, larg) {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('width', tam); s.setAttribute('height', tam); s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', larg || '1.7');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = conteudo;                                             // (só desenhos fixos, deste site)
    return s;
  }
  const icone = (d, tam, larg) => svg(tam || 20, '<path d="' + d + '"/>', larg);
  // o desenho de um símbolo: o traço, ou a imagem do mestre
  const desenhoDe = (s, tam) => (s.img ? h('img', { src: s.img, alt: '', width: tam || 28, height: tam || 28 }) : icone(s.d, tam || 28));
  const ICO = {
    amb: 'M3 19.5h18M4.5 19.5 10 10l3.2 5.2 2.1-3 4.2 7.3',
    hora: 'M3 18h18M7 18a5 5 0 0 1 10 0M12 4v3M4.9 9.9l2 1.4M19.1 9.9l-2 1.4',
    tranca: 'M5 11h14v10H5zM8 11V8a4 4 0 0 1 8 0v3',
    medita: 'M12 3a2 2 0 1 1 0 4 2 2 0 1 1 0-4M12 7.5v5M12 9.6c-1.6 1.6-3.6 2.6-6 3M12 9.6c1.6 1.6 3.6 2.6 6 3M4.5 18c2.4-1.9 4.9-2.8 7.5-2.8s5.1.9 7.5 2.8M8 20.5h8',
    imagem: 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4M15.5 8.5h.01',
  };
  const guarda = {
    ler(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    gravar(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  };
  const imagemOk = v => typeof v === 'string' && (/^https:\/\/[^\s"'<>]+$/i.test(v) || /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v));
  const quando = iso => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
  const climaNome = c => (c && JN && JN.CLIMAS[c] ? JN.CLIMAS[c].nome : 'Céu limpo');
  const iniciais = nome => String(nome || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toUpperCase() || '?';

  /* ---------------- pintar por cima (morph): o campo em que se escreve não sai do lugar ---------------- */
  const PROPS = ['onclick', 'onchange', 'oninput', 'onkeydown'];
  const textual = el => el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|reset|file|range)$/i.test(el.type || ''));
  const seletor = k => '[data-k="' + (window.CSS && CSS.escape ? CSS.escape(k) : String(k).replace(/["\\]/g, '\\$&')) + '"]';
  function mesmo(a, b) {
    if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName) return false;
    if (a.nodeType !== 1) return true;
    if ((a.getAttribute('data-k') || '') !== (b.getAttribute('data-k') || '')) return false;
    return a.tagName !== 'INPUT' || a.type === b.type;
  }
  function morph(v, n, foco) {
    if (!mesmo(v, n)) { v.replaceWith(n); return; }
    if (v.nodeType !== 1) { if (v.nodeValue !== n.nodeValue) v.nodeValue = n.nodeValue; return; }
    if (v.namespaceURI === NS) { if (!v.isEqualNode(n)) v.replaceWith(n); return; }
    for (const a of [...v.attributes]) if (!n.hasAttribute(a.name)) v.removeAttribute(a.name);
    for (const a of n.attributes) if (v.getAttribute(a.name) !== a.value) v.setAttribute(a.name, a.value);
    for (const p of PROPS) if (v[p] !== n[p]) v[p] = n[p];
    if (v.tagName !== 'TEXTAREA') morphFilhos(v, n, foco);
    if (v.tagName === 'INPUT' || v.tagName === 'TEXTAREA' || v.tagName === 'SELECT') {
      if (!(v === foco && textual(v)) && v.value !== n.value) v.value = n.value;
      if (v.tagName === 'INPUT' && v.checked !== n.checked) v.checked = n.checked;
    }
  }
  function morphFilhos(v, n, foco) {
    const vc = [...v.childNodes], nc = [...n.childNodes];
    const k = foco && foco.getAttribute && foco.getAttribute('data-k');
    let iv = -1, inn = -1;
    if (k && v.contains(foco)) {
      const sel = seletor(k);
      iv = vc.findIndex(c => c === foco || (c.nodeType === 1 && c.contains(foco)));
      inn = nc.findIndex(c => c.nodeType === 1 && (c.matches(sel) || !!c.querySelector(sel)));
    }
    if (iv < 0 || inn < 0) { parear(v, vc, nc, null, foco); return; }
    parear(v, vc.slice(0, iv), nc.slice(0, inn), vc[iv], foco);
    morph(vc[iv], nc[inn], foco);
    parear(v, vc.slice(iv + 1), nc.slice(inn + 1), null, foco);
  }
  function parear(pai, vc, nc, antes, foco) {
    const n = Math.min(vc.length, nc.length);
    for (let i = 0; i < n; i++) morph(vc[i], nc[i], foco);
    for (let i = n; i < nc.length; i++) pai.insertBefore(nc[i], antes);
    for (let i = n; i < vc.length; i++) vc[i].remove();
  }
  function morphEm(alvo, filhos) {
    const a = document.activeElement, foco = a && a !== alvo && alvo.contains(a) ? a : null;
    morphFilhos(alvo, h('div', null, filhos), foco);
  }

  /* ---------------- os documentos ---------------- */
  const CENA = 'medit:cena', QUEM = 'medit:quem', SIMB = 'medit:simbolos', REC = 'medit:receitas', TREINO = 'medit:treino', PRE_P = 'medit:pratica:', PRE_A = 'medit:achados:';
  const VIS = { [CENA]: 'mesa', [QUEM]: 'mesa', [SIMB]: 'mesa', [REC]: 'mestre', [TREINO]: 'mestre' };
  const L_DOCS = 'tinycats:meditacao:local', PC_TESTE = 'pc_teste', L_PANTEAO = 'teste:panteao', L_FIGURA = 'teste:imgMed';
  let st = null, D = null, P = null, naMesa = false, mestre = true, eu = null, pronto = false;
  let vista = guarda.ler('tinycats:meditacao:vista') === 'receitas' ? 'receitas' : 'cena';
  let sel = null, recSel = null, grupoVisto = 'el', seqAtual = [], resultado = null, ocupado = false, pilarEd = 0;
  let novaBarra = { nome: '', max: '10' };       // o rascunho da barra de treinamento nova
  let pilha = [];                                 // o desfazer: { rotulo, desfazer() }
  let pintando = false, pendente = false;
  let local = {};                                 // fora de uma mesa: os documentos, neste navegador
  let tSalvo = 0;

  function lerLocal() { try { const d = JSON.parse(guarda.ler(L_DOCS) || 'null'); local = ehObj(d) ? d : {}; } catch (e) { local = {}; } }
  function salvarLocal() { if (!guarda.gravar(L_DOCS, j(local))) toast('Não deu para guardar neste navegador (a imagem pode ser grande demais para ele).'); }
  /* (lote 7, parte 5c) O clima de hoje no Mapa-múndi (o do mapa mostrado aos jogadores, onde o grupo está; senão, o do
     mundo): um dos climas daqui (os do Jornal), ou null fora de uma mesa ou sem mapa mostrado. */
  function climaDoMundo() {
    if (!naMesa || !D) return null;
    const dados = id => { const l = D.pegar(id); return l && !l.apagado && ehObj(l.dados) ? l.dados : null; };
    const idx = dados('mundo:indice'), mostrado = idx && typeof idx.mostrado === 'string' ? idx.mostrado : null, m = mostrado ? dados('mundo:pub:' + mostrado) : null;
    if (!m) return null;
    const g = (Array.isArray(m.objs) ? m.objs : []).find(o => ehObj(o) && o.k === 'g' && !o.tipo && N.CLIMAS.includes(o.ch));
    const k = g ? g.ch : ehObj(m.clima) ? m.clima.hoje : null;
    return N.CLIMAS.includes(k) ? k : null;
  }
  function doc(id) {
    if (!naMesa) return local[id] == null ? null : local[id];
    const l = D && D.pegar(id);
    return l && !l.apagado ? l.dados : null;
  }
  // (o dono e a visibilidade vão só quando o documento nasce: depois, quem muda o dono é o banco — ver a 0017)
  function gravarDoc(id, dados, dono) {
    if (naMesa) {
      const campos = { dados: copia(dados) };
      if (!D.pegar(id)) { campos.vis = VIS[id] || 'mestre'; if (dono) campos.dono_id = dono; }
      D.gravar(id, campos, null, { cas: true });
    } else { local[id] = copia(dados); salvarLocal(); }
    marcarSalvo();
  }
  function marcarSalvo() {
    const el = $('salvo');
    el.textContent = naMesa ? 'Salvando…' : 'Neste navegador';
    clearTimeout(tSalvo);
    if (naMesa) tSalvo = setTimeout(() => { el.textContent = 'Salvo na mesa'; }, 700);
  }
  /* Desfazer uma mudança num documento que outra pessoa também pode ter mexido depois: volta só o que esta mudança
     mudou (o resto, como está agora). Chave por chave; numa chave que os dois mudaram, vale o de antes. */
  function juntar3(base, meu, deles) {
    if (j(meu) === j(base)) return deles;
    if (j(deles) === j(base)) return meu;
    if (ehObj(base) && ehObj(meu) && ehObj(deles)) {
      const out = {};
      for (const k of new Set([...Object.keys(base), ...Object.keys(meu), ...Object.keys(deles)])) { const v = juntar3(base[k], meu[k], deles[k]); if (v !== undefined) out[k] = v; }
      return out;
    }
    return meu;
  }
  // Mudar um documento (um passo de desfazer): fn recebe a cópia normalizada; devolver false = nada a fazer.
  function mudarDoc(id, rotulo, norm, fn, dono, quieto) {
    const antes = norm(copia(doc(id))), novo = norm(copia(doc(id)));
    if (fn(novo) === false) return false;
    const depois = norm(novo);
    if (j(depois) === j(antes)) return false;
    gravarDoc(id, depois, dono);
    empilhar(rotulo, () => gravarDoc(id, norm(juntar3(depois, antes, norm(copia(doc(id))))), dono));
    if (!quieto) pintar();
    return true;
  }
  function empilhar(rotulo, desfazer) { pilha.push({ rotulo, desfazer }); if (pilha.length > 120) pilha.shift(); return pilha[pilha.length - 1]; }
  function desfazer(passo) {
    if (passo && pilha[pilha.length - 1] !== passo) { toast('Já houve outra mudança depois. Use o botão Desfazer, lá em cima.'); return; }
    const p = pilha.pop();
    if (!p) return;
    Promise.resolve().then(p.desfazer).then(() => { pintar(); toast('Desfeito: ' + p.rotulo + '.'); }, e => { pintar(); toast((e && e.message) || 'Não deu para desfazer.'); });
  }

  /* ---------------- quem é quem ---------------- */
  function personagens() {
    if (!naMesa) return [{ id: PC_TESTE, nome: 'Personagem de teste', dono: 'local', campanha: null, img: null, ficha: { panteao: typeof local[L_PANTEAO] === 'string' ? local[L_PANTEAO] : '', imgMed: local[L_FIGURA] || null } }];
    return P.todas().filter(l => !l.apagado && typeof l.id === 'string' && String(l.nome || '').trim())
      .map(l => { const f = ehObj(l.ficha) ? l.ficha : {}; return { id: l.id, nome: String(l.nome).trim(), dono: l.dono_id || null, campanha: l.campanha || null, img: imagemOk(f.img) ? f.img : null, ficha: f }; })
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }
  const pcDe = id => personagens().find(p => p.id === id) || null;
  const meus = () => (naMesa ? personagens().filter(p => p.dono && p.dono === eu) : personagens());
  const meu = p => !!p && (!naMesa || (!!p.dono && p.dono === eu));
  const veAPratica = p => mestre || meu(p);
  function nomeDoMembro(uid) { const m = st && Array.isArray(st.membros) ? st.membros.find(x => x.id === uid) : null; return m ? m.nome : ''; }
  const deQuem = p => (!naMesa ? 'personagem de teste' : p.dono ? 'de ' + (nomeDoMembro(p.dono) || 'um jogador') : 'sem dono');
  const pratica = id => N.normPratica(doc(PRE_P + id));
  const achados = id => N.normAchados(doc(PRE_A + id));
  const quemMedita = () => N.normQuem(doc(QUEM)).quem;
  const panteaoDe = p => (p && p.ficha && typeof p.ficha.panteao === 'string' ? p.ficha.panteao : '');
  // o panteão é o da ficha: muda quem pode mudar a ficha (o dono, ou quem mestra as Fichas)
  const podePanteao = p => !naMesa || meu(p) || !!(window.TC && TC.ponte && TC.ponte.mestra && TC.ponte.mestra('fichas'));
  /* (lote 7) A imagem meditando mora na ficha (ficha.imgMed): todos que veem o personagem a veem na cena, grande e
     recortada (um PNG com fundo transparente fica só com o personagem). Muda quem pode mudar a ficha, como o panteão.
     A de antes (medit:pratica, img) — que só o dono e o mestre viam — continua valendo para eles, no retrato redondo,
     até ser trocada. */
  const figuraDe = p => { const v = p && p.ficha ? p.ficha.imgMed : null; return imagemOk(v) ? v : null; };
  const podeFigura = podePanteao;
  function porCampanha(itens) {
    const T = window.TC && TC.ponte;
    return naMesa && T && typeof T.porCampanha === 'function' ? T.porCampanha(itens, p => p.campanha) : [{ id: '', nome: '', itens }];
  }

  /* ---------------- o que passa pelo banco (ou, fora da mesa, pela página) ---------------- */
  async function pedir(op, args) {
    if (naMesa) {
      if (!window.TC || !TC.ponte || typeof TC.ponte.meditacao !== 'function') throw new Error('Esta página está desatualizada: recarregue o site.');
      return TC.ponte.meditacao(op, args);
    }
    const ach = local[PRE_A + args.pc];
    if (op === 'entrar') {
      const r = N.localEntrar(local[QUEM], local[CENA], ach, args.pc, !!args.entrar, null, false);
      if (!r.ok) throw new Error(r.msg);
      local[QUEM] = r.quem; local[PRE_A + args.pc] = r.achados; salvarLocal();
      return { quem: r.quem.quem };
    }
    if (op === 'liberar') { const a = N.localLiberar(ach, args.mais); local[PRE_A + args.pc] = a; salvarLocal(); return { lib: a.lib, feitas: a.feitas }; }
    if (op === 'tentar') {
      const r = N.localTentar(local[QUEM], local[CENA], ach, local[REC], args.pc, args.seq);
      if (!r.ok) throw new Error(r.msg);
      local[PRE_A + args.pc] = r.achados; salvarLocal();
      return r.res;
    }
    throw new Error('Pedido desconhecido.');
  }
  async function acao(fn) {
    if (ocupado) return null;
    ocupado = true; pintar();
    try { return await fn(); }
    catch (e) { toast((e && e.message) || 'Não deu certo agora. Tente de novo.'); return null; }
    finally { ocupado = false; pintar(); }
  }
  async function entrar(pc, sim) {
    const r = await acao(() => pedir('entrar', { pc, entrar: sim }));
    if (!r) return;
    const nome = (pcDe(pc) || {}).nome || 'O personagem';
    const passo = empilhar(sim ? 'pôr ' + nome + ' para meditar' : 'tirar ' + nome + ' da meditação', () => pedir('entrar', { pc, entrar: !sim }));
    toast(sim ? nome + ' está meditando.' : nome + ' saiu da meditação.', 'Desfazer', () => desfazer(passo));
  }
  async function liberar(pc, mais) {
    const r = await acao(() => pedir('liberar', { pc, mais }));
    if (!r) return;
    const nome = (pcDe(pc) || {}).nome || 'o personagem', depois = r.lib;
    const passo = empilhar((mais > 0 ? 'liberar' : 'tirar') + ' a tentativa de ' + nome, async () => {
      const v = await pedir('liberar', { pc, mais: -mais });
      if (mais > 0 && v && v.lib >= depois) throw new Error(nome + ' já usou a tentativa: ela não volta.');
    });
    toast(mais > 0 ? 'Tentativa liberada para ' + nome + '.' : 'Tentativa de ' + nome + ' tirada.', 'Desfazer', () => desfazer(passo));
  }
  async function tentar(pc) {
    const seq = seqAtual.slice();
    const r = await acao(() => pedir('tentar', { pc, seq }));
    if (!r) return;
    resultado = { pc, seq, res: r };
    seqAtual = [];
    pintar();
  }

  /* ---------------- a cena ---------------- */
  let chaveDesenho = '', climaFeito = null;
  function montarPalco() {
    $('palco').replaceChildren(
      h('div', { class: 'fundo', id: 'fundo' }),
      h('div', { class: 'tinta', id: 'tinta', hidden: true }),
      h('div', { class: 'clima', id: 'clima', 'aria-hidden': 'true' }),
      h('div', { class: 'gente', id: 'gente' }),
      h('div', { class: 'chips', id: 'chips' }));
  }
  // o clima por cima da cena (os mesmos do Acampamento, mais o sol, o nublado, o calor e o frio)
  function pintarClima(c) {
    if (c === climaFeito) return;
    climaFeito = c;
    const el = $('clima');
    el.className = 'clima' + (c ? ' clima-' + c : '');
    let a = 9301;
    const r = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
    const n = { chuva: 90, tempestade: 130, neve: 70, nevoa: 3, vento: 26, nublado: 4 }[c] || 0, out = [];
    for (let i = 0; i < n; i++) {
      if (c === 'nevoa') out.push(`<i style="--b:${4 + i * 14}%;--t:${38 + i * 14}s;animation-delay:-${(r() * 40).toFixed(1)}s"></i>`);
      else if (c === 'nublado') out.push(`<i style="--y:${(4 + i * 9).toFixed(0)}%;--t:${60 + i * 18}s;animation-delay:-${(r() * 60).toFixed(1)}s"></i>`);
      else if (c === 'neve') out.push(`<i style="left:${(r() * 104 - 2).toFixed(1)}%;--d:${(3 + r() * 5).toFixed(1)}px;--t:${(7 + r() * 7).toFixed(1)}s;animation-delay:-${(r() * 14).toFixed(1)}s"></i>`);
      else if (c === 'vento') out.push(`<i style="--y:${(15 + r() * 75).toFixed(1)}%;--c:${['#b8873e', '#8f9a4a', '#a3542e', '#c9a35a'][i % 4]};--t:${(4 + r() * 4).toFixed(1)}s;animation-delay:-${(r() * 8).toFixed(1)}s"></i>`);
      else out.push(`<i style="left:${(r() * 120 - 5).toFixed(1)}%;--t:${((c === 'tempestade' ? 0.45 : 0.7) + r() * 0.35).toFixed(2)}s;animation-delay:-${(r() * 2).toFixed(2)}s"></i>`);
    }
    el.innerHTML = out.join('');                                         // (só números feitos aqui)
  }
  // A figura de quem medita com a imagem meditando: a altura (em % da altura da cena) e a largura máxima (em % da
  // largura), pelo número de quem medita — sozinho, até metade da cena; com mais gente, menor.
  function tamanhoDaFigura(n) {
    if (n > 6) return { alt: 30, larg: 18 };
    const t = [[50, 70], [46, 46], [42, 34], [38, 27], [34, 22], [32, 19]][Math.max(0, n - 1)];
    return { alt: t[0], larg: t[1] };
  }
  function pintarCena() {
    const c = N.normCena(doc(CENA));
    $('palco').className = 'palco hora-' + c.hora;
    const chave = j([c.amb, c.hora, c.img]);
    if (chave !== chaveDesenho) {
      chaveDesenho = chave;
      if (c.img) $('fundo').replaceChildren(h('img', { src: c.img, alt: '' }));
      else $('fundo').innerHTML = DES.cena({ amb: c.amb, hora: c.hora, sufixo: 'cena' });     // (desenho fixo, deste site)
      $('tinta').hidden = !c.img;
    }
    pintarClima(c.clima);
    // quem está meditando (um personagem que esta pessoa não vê — escondido, ou apagado — não aparece)
    const pcs = quemMedita().map(pcDe).filter(Boolean), lug = DES.lugares(pcs.length), tam = tamanhoDaFigura(pcs.length);
    morphEm($('gente'), pcs.length ? pcs.map((p, i) => {
      const ve = veAPratica(p), pr = ve ? pratica(p.id) : null, fig = figuraDe(p), img = (pr && pr.img) || p.img, ach = ve && p.dono ? achados(p.id) : null;
      const status = ach ? (ach.lib > ach.feitas ? h('span', { class: 'st lib', text: 'tentativa liberada' }) : mestre ? h('span', { class: 'st', text: 'sem tentativa' }) : null) : null;
      const L = lug[i], base = L.fila === 1 ? 92 : lug.some(x => x.fila === 1) ? 80 : 86;
      // com a imagem meditando, o personagem inteiro, de pé no chão da cena (o pé dele na linha `base`), com a aura em
      // volta do contorno; sem ela, o retrato redondo de sempre
      return h(ve ? 'button' : 'div', { type: ve ? 'button' : null, class: fig ? 'quem fig' : 'quem', 'data-k': 'q:' + p.id + (fig ? ':fig' : ''), 'data-pc': p.id, 'aria-pressed': ve ? String(sel === p.id) : null,
        style: fig ? `left:${L.x}%;top:${base}%;--alt:${tam.alt};--larg:${tam.larg}` : `left:${L.x}%;top:${L.y}%`,
        title: ve ? 'Ver ' + p.nome : null, onclick: ve ? () => { if (sel !== p.id) { sel = p.id; seqAtual = []; resultado = null; } pintar(); } : null },
        fig ? h('span', { class: 'corpo' }, h('span', { class: 'chao' }), h('img', { class: 'brilho', src: fig, alt: '', 'aria-hidden': 'true' }), h('img', { class: 'fig-img', src: fig, alt: '' }))
          : h('span', { class: 'ret' }, h('span', { class: 'aura' }), img ? h('img', { src: img, alt: '' }) : iniciais(p.nome)),
        h('span', { class: 'nm', text: p.nome }), status);
    }) : [h('div', { class: 'vazio-cena', 'data-k': 'vazio', text: mestre ? 'Ninguém meditando. Chame os personagens pelo painel — ou cada jogador entra pela aba dele.' : 'Ninguém meditando agora.' })]);
    morphEm($('chips'), [
      h('span', { class: 'chip', 'data-k': 'ch:amb' }, icone(ICO.amb, 16), N.AMB_NOME[c.amb] + (c.img ? ' · imagem do mestre' : '')),
      h('span', { class: 'chip', 'data-k': 'ch:hora' }, icone(ICO.hora, 16), N.HORA_NOME[c.hora]),
      h('span', { class: 'chip', 'data-k': 'ch:clima' }, c.clima && JN && JN.CLIMAS[c.clima] ? svg(16, JN.CLIMAS[c.clima].svg) : null, climaNome(c.clima)),
      h('span', { class: 'grow' }),
      h('span', { class: 'chip', 'data-k': 'ch:quem', text: pcs.length ? 'Meditando agora: ' + pcs.map(p => p.nome).join(', ') : 'Ninguém meditando agora' }),
    ]);
  }
  function pintarAmbientes() {
    const el = $('ambientes'), c = N.normCena(doc(CENA));
    el.hidden = !mestre;
    if (el.hidden) return;
    const chave = j([c.amb, c.hora, !!c.img]);
    if (el.dataset.chave === chave) return;
    el.dataset.chave = chave;
    el.replaceChildren(...N.AMBIENTES.map(([id, nome]) => {
      const vista = h('span', { class: 'vista hora-' + c.hora });
      vista.innerHTML = DES.miniatura(id, c.hora);                      // (desenho fixo, deste site)
      return h('button', { type: 'button', class: 'amb', 'data-amb': id, 'aria-pressed': String(c.amb === id && !c.img), title: 'A cena: ' + nome, onclick: () => escolherAmbiente(id) }, vista, h('span', { text: nome }));
    }), h('button', { type: 'button', class: 'amb img', 'data-amb': 'imagem', 'aria-pressed': String(!!c.img), onclick: () => escolherImagem({ para: 'fundo' }) },
      icone(ICO.imagem, 22), h('span', { text: c.img ? 'Trocar a imagem' : 'Imagem própria…' })));
  }
  function escolherAmbiente(id) {
    const c = N.normCena(doc(CENA));
    if (c.amb === id && !c.img) return;
    mudarDoc(CENA, c.img ? 'trocar a imagem pelo desenho' : 'mudar o ambiente', N.normCena, x => { x.amb = id; x.img = null; });
  }

  /* ---------------- a barra de cima ---------------- */
  function barra() {
    const out = [];
    if (mestre) {
      out.push(h('div', { class: 'seg', role: 'group', 'aria-label': 'O que ver', id: 'vistas' },
        h('button', { type: 'button', 'data-vista': 'cena', 'aria-pressed': String(vista === 'cena'), onclick: () => trocarVista('cena') }, 'A cena'),
        h('button', { type: 'button', 'data-vista': 'receitas', 'aria-pressed': String(vista === 'receitas'), onclick: () => trocarVista('receitas') }, 'Receitas e símbolos')));
      if (vista === 'cena') {
        const c = N.normCena(doc(CENA));
        out.push(h('label', { class: 'rot' }, 'Ambiente', h('select', { class: 'in', 'data-k': 'c:amb', value: c.amb, onchange: function () { escolherAmbiente(this.value); } },
          N.AMBIENTES.map(([id, nome]) => h('option', { value: id, text: nome })))));
        out.push(h('div', { class: 'seg', role: 'group', 'aria-label': 'A hora', id: 'horas' }, N.HORAS.map(([id, nome]) =>
          h('button', { type: 'button', 'data-hora': id, 'aria-pressed': String(c.hora === id), onclick: () => mudarDoc(CENA, 'mudar a hora', N.normCena, x => { if (x.hora === id) return false; x.hora = id; }) }, nome))));
        out.push(h('label', { class: 'rot' }, 'Clima', h('select', { class: 'in', 'data-k': 'c:clima', value: c.clima, onchange: function () { const v = this.value; mudarDoc(CENA, 'mudar o clima', N.normCena, x => { x.clima = v; }); } },
          h('option', { value: '', text: 'Céu limpo' }), N.CLIMAS.map(id => h('option', { value: id, text: climaNome(id) })))));
        // (lote 7, parte 5c) o clima de hoje no Mapa-múndi: aparece aqui, e o mestre o usa no fundo da cena se quiser
        const cm = climaDoMundo();
        if (cm) out.push(h('p', { class: 'note', 'data-k': 'c:clima-mundo' }, 'Hoje no Mapa-múndi: ' + climaNome(cm) + '. ',
          cm !== c.clima ? h('button', { type: 'button', class: 'btn sm', 'data-k': 'c:clima-usar', onclick: () => mudarDoc(CENA, 'usar o clima do Mapa-múndi', N.normCena, x => { if (x.clima === cm) return false; x.clima = cm; }) }, 'Usar no fundo da cena') : null));
        if (c.img) out.push(h('button', { type: 'button', class: 'btn sm', 'data-k': 'c:sem-img', onclick: () => mudarDoc(CENA, 'tirar a imagem do mestre', N.normCena, x => { x.img = null; }) }, 'Voltar ao desenho'));
      }
    } else {
      const ms = meus();
      if (ms.length > 1) out.push(h('label', { class: 'rot' }, 'Personagem', h('select', { class: 'in', 'data-k': 'j:pc', value: sel || '', onchange: function () { sel = this.value; seqAtual = []; resultado = null; pintar(); } },
        ms.map(p => h('option', { value: p.id, text: p.nome })))));
    }
    return out;
  }
  function trocarVista(v) { vista = v; guarda.gravar('tinycats:meditacao:vista', v); pintar(); }

  /* ---------------- pedaços do painel ---------------- */
  // um campo que grava quando a pessoa termina de escrever (um passo de desfazer cada)
  function campoTexto(k, rotulo, valor, gravar, o = {}) {
    const el = h(o.area ? 'textarea' : 'input', { class: 'in', type: o.area ? null : 'text', 'data-k': k, value: valor || '', maxlength: o.max || 200, placeholder: o.ph || null,
      rows: o.area ? o.linhas || 3 : null, autocomplete: 'off', disabled: !!o.off, onchange: function () { gravar(this.value); } });
    return h('label', { class: 'field' }, h('span', { text: rotulo }), el, o.dica ? h('small', { class: 'ajuda', text: o.dica }) : null);
  }
  function secao(titulo, extra, ...conteudo) {
    return h('section', { class: 'sec' }, h('div', { class: 'cab' }, h('h2', { text: titulo }), extra || null), ...conteudo);
  }
  function retratoP(p) {
    const fig = figuraDe(p);
    if (fig) return h('span', { class: 'retrato-p fig' }, h('img', { src: fig, alt: '' }));
    const pr = veAPratica(p) ? pratica(p.id) : null, img = (pr && pr.img) || p.img;
    return h('span', { class: 'retrato-p' }, img ? h('img', { src: img, alt: '' }) : iniciais(p.nome));
  }
  // A prática de um personagem: quem joga escreve a do personagem dele; quem mestra também pode mudar.
  function secaoPratica(p) {
    const pr = pratica(p.id), dono = naMesa ? p.dono : null, fig = figuraDe(p);
    const gravar = (campo, rot) => v => mudarDoc(PRE_P + p.id, rot, N.normPratica, x => { x[campo] = v; }, dono);
    const quemVe = !naMesa ? 'Fica neste navegador' : mestre && !meu(p) ? (p.dono ? 'O dono e quem mestra veem' : 'Só quem mestra vê') : 'Só você e o mestre veem';
    return secao('A prática de ' + p.nome, h('small', { text: quemVe }),
      campoTexto('p:objeto', 'Objeto', pr.objeto, gravar('objeto', 'mudar o objeto'), { max: N.MAX.objeto, ph: 'Um colar de dentes de lobo' }),
      campoTexto('p:mantra', 'Mantra', pr.mantra, gravar('mantra', 'mudar o mantra'), { max: N.MAX.mantra, ph: 'A lua não tem pressa, e ainda assim chega.' }),
      campoTexto('p:rep', 'Representação', pr.rep, gravar('rep', 'mudar a representação'), { area: true, linhas: 3, max: N.MAX.rep, ph: 'O que o personagem vê quando medita' }),
      h('div', { class: 'row', style: 'align-items:flex-end' },
        h('div', { style: 'flex:1 1 180px;min-width:0' }, campoTexto('p:panteao', 'Panteão', panteaoDe(p), v => mudarPanteao(p, v), { max: 60, ph: 'A quem o personagem reza', off: !podePanteao(p),
          dica: podePanteao(p) ? 'O mesmo campo da ficha: mudar aqui muda lá.' : 'O mesmo da ficha: quem muda é o dono, ou quem mestra as Fichas.' })),
        h('div', { class: 'row', style: 'gap:6px' }, retratoP(p),
          h('button', { type: 'button', class: 'btn sm', 'data-k': 'p:img', disabled: !podeFigura(p), title: podeFigura(p) ? null : 'Quem põe a imagem meditando é o dono, ou quem mestra as Fichas',
            onclick: () => escolherImagem({ para: 'figura', pc: p.id }) }, fig || pr.img ? 'Trocar a imagem' : 'Imagem meditando…'),
          fig ? (podeFigura(p) ? h('button', { type: 'button', class: 'btn sm', 'data-k': 'p:sem-img', onclick: () => { if (mudarFigura(p, null, 'tirar a imagem meditando')) avisoDesfazer('A imagem meditando saiu.'); } }, 'Tirar') : null)
            : pr.img ? h('button', { type: 'button', class: 'btn sm', 'data-k': 'p:sem-img', onclick: () => mudarDoc(PRE_P + p.id, 'tirar a imagem meditando', N.normPratica, x => { x.img = null; }, dono) }, 'Tirar') : null)),
      h('small', { class: 'ajuda', 'data-k': 'p:img-ajuda', text: !fig && pr.img ? 'Esta é a imagem de antes: só você e o mestre a veem. Troque a imagem para que ela apareça grande na cena, para todos.'
        : 'A imagem meditando aparece grande na cena, para todos da mesa. Um PNG com fundo transparente deixa só o personagem.' }));
  }
  /* Pôr, trocar ou tirar (url null) a imagem meditando: ela fica na ficha (ficha.imgMed), como o panteão. Um passo de
     desfazer, que volta só a imagem. → true quando mudou. */
  function mudarFigura(p, url, rotulo) {
    const antes = figuraDe(p), novo = url && imagemOk(url) ? url : null;
    if (novo === antes || !podeFigura(p)) return false;
    const gravar = valor => {
      if (!naMesa) { if (valor) local[L_FIGURA] = valor; else delete local[L_FIGURA]; salvarLocal(); return; }
      const l = P.pegar(p.id);
      if (!l) throw new Error('Esse personagem não está mais na mesa.');
      const f = Object.assign({}, ehObj(l.ficha) ? l.ficha : {});
      if (valor) f.imgMed = valor; else delete f.imgMed;
      P.gravar(p.id, { ficha: f });
    };
    gravar(novo);
    empilhar(rotulo, () => gravar(antes));
    marcarSalvo(); pintar();
    return true;
  }
  function mudarPanteao(p, v) {
    const novo = String(v || '').replace(/\s+/g, ' ').trim().slice(0, 60), antes = panteaoDe(p);
    if (novo === antes || !podePanteao(p)) { pintar(); return; }
    const gravar = valor => {
      if (!naMesa) { local[L_PANTEAO] = valor; salvarLocal(); return; }
      const l = P.pegar(p.id);
      if (!l) throw new Error('Esse personagem não está mais na mesa.');
      P.gravar(p.id, { ficha: Object.assign({}, ehObj(l.ficha) ? l.ficha : {}, { panteao: valor }) });
    };
    gravar(novo);
    empilhar('mudar o panteão', () => gravar(antes));
    marcarSalvo(); pintar();
  }
  function secaoPilares(p) {
    const ach = achados(p.id), noAr = quemMedita().includes(p.id), lib = ach.lib > ach.feitas, livres = ach.lib - ach.feitas;
    const simb = doc(SIMB), gs = N.grupos(simb, false);
    if (!gs.some(g => g.id === grupoVisto)) grupoVisto = gs.length ? gs[0].id : 'el';
    const pode = noAr && lib && !ocupado;
    const pilares = h('div', { class: 'pilares', 'data-k': 'pilares' }, [0, 1, 2, 3, 4].map(i => {
      const id = seqAtual[i], s = id ? N.simbolo(simb, id) : null;
      return h('button', { type: 'button', class: 'pilar' + (s ? ' cheio' : ''), 'data-k': 'pilar:' + i, disabled: !s || !pode,
        'aria-label': s ? 'Pilar ' + (i + 1) + ': ' + s.nome + ' (clique para tirar)' : 'Pilar ' + (i + 1) + ' vazio', onclick: () => { seqAtual.splice(i, 1); pintar(); } },
        h('span', { class: 'pedra' }, s ? desenhoDe(s, 30) : null), h('span', { class: 'coluna' }), h('small', { text: s ? s.nome : i < 2 ? 'vazio' : 'opcional' }));
    }));
    const g = gs.find(x => x.id === grupoVisto);
    const txt = !noAr ? 'Entre na meditação para usar os pilares' : !lib ? 'Esperando o mestre liberar uma tentativa' : seqAtual.length < N.MAX.minPilares ? 'Ponha pelo menos 2 símbolos' : 'Meditar sobre os pilares';
    const res = resultado && resultado.pc === p.id ? resultado : null;
    return secao('Os pilares', h('span', { class: 'tag' + (lib ? ' ok' : ''), 'data-k': 'tent', text: lib ? (livres > 1 ? livres + ' tentativas liberadas' : 'O mestre liberou 1 tentativa') : 'Sem tentativa agora' }),
      h('p', { class: 'ajuda', text: 'Ponha de 2 a 5 símbolos, na ordem — a ordem importa. Clique num pilar para tirar o símbolo dele.' }),
      pilares,
      h('div', { class: 'seg', role: 'group', 'aria-label': 'Grupos de símbolos', 'data-k': 'grupos' },
        gs.map(x => h('button', { type: 'button', 'data-grupo': x.id, 'aria-pressed': String(x.id === grupoVisto), onclick: () => { grupoVisto = x.id; pintar(); } }, x.nome))),
      h('div', { class: 'simbolos', 'data-k': 'simbolos' }, (g ? g.itens : []).map(s => h('button', { type: 'button', class: 'simb', 'data-simb': s.id, disabled: !pode || seqAtual.length >= N.MAX.pilares,
        'aria-label': 'Pôr ' + s.nome + ' no próximo pilar', onclick: () => { if (seqAtual.length < N.MAX.pilares) { seqAtual.push(s.id); resultado = null; pintar(); } } }, desenhoDe(s, 24), h('span', { text: s.nome })))),
      h('button', { type: 'button', class: 'btn pri lg', 'data-k': 'tentar', disabled: !(pode && seqAtual.length >= N.MAX.minPilares), onclick: () => tentar(p.id) }, txt),
      res && res.res.res === 'achou'
        ? h('div', { class: 'res achou', role: 'status', 'data-k': 'res' }, h('b', { text: (res.res.nova ? 'Você descobriu: ' : 'Você já conhecia: ') + res.res.nome }),
          h('span', { class: 'txt', text: res.res.efeito || '' }), h('small', { class: 'ajuda', text: res.res.nova ? 'Só você vê esta receita (e o mestre, que recebeu um aviso).' : 'Ela já estava na sua lista.' }))
        : res ? h('div', { class: 'res', role: 'status', 'data-k': 'res' }, h('b', { text: 'Nada aconteceu.' }), h('small', { class: 'ajuda', text: N.seqTxt(simb, res.seq) + ' · o mestre vê a tentativa.' })) : null);
  }
  function secaoAchadas(p, corrigir) {
    const ach = achados(p.id), simbDoc = doc(SIMB), rec = mestre ? N.normReceitas(doc(REC)) : null;
    return secao('Receitas descobertas', h('small', { text: String(ach.achadas.length) }),
      ach.achadas.length ? ach.achadas.slice().reverse().map(a => {
        const r = rec && rec.lista.find(x => x.id === a.id), seq = r ? r.seq : null;
        return h('div', { class: 'receita', 'data-achada': a.id },
          h('div', { class: 'cab' }, h('b', { text: a.nome }), seq ? h('span', { class: 'seq' }, seq.map(id => desenhoDe(N.simbolo(simbDoc, id), 20))) : null,
            corrigir ? h('button', { type: 'button', class: 'ib leve', title: 'Tirar da lista', 'aria-label': 'Tirar ' + a.nome + ' da lista', onclick: () => tirarAchada(p, a) }, '×') : null),
          seq ? h('small', { text: N.seqTxt(simbDoc, seq) }) : null,
          h('span', { class: 'txt', text: a.efeito }),
          h('small', { text: 'Descoberta em ' + (quando(a.em) || '?') + (a.amb ? ', ' + N.AMB_NOME[a.amb] : '') }));
      }) : h('p', { class: 'vazio-p', text: 'Nenhuma ainda.' }));
  }
  function tirarAchada(p, a) {
    if (mudarDoc(PRE_A + p.id, 'tirar "' + a.nome + '" da lista de ' + p.nome, N.normAchados, x => { const n = x.achadas.length; x.achadas = x.achadas.filter(y => y.id !== a.id); return x.achadas.length !== n; }, naMesa ? p.dono : null))
      avisoDesfazer('"' + a.nome + '" saiu da lista de ' + p.nome + '.');
  }
  // (lote 7) Quem mestra limpa o registro de um personagem: só as linhas do registro saem — as receitas descobertas e as
  // tentativas liberadas e feitas ficam como estão. Com confirmação e Desfazer.
  async function limparRegistro(p) {
    const n = achados(p.id).reg.length;
    if (!n || !mestre) return;
    const ok = await confirmar('Limpar o registro de ' + p.nome + '?', (n === 1 ? 'A linha do registro sai' : 'As ' + n + ' linhas do registro saem') +
      '. As receitas descobertas e as tentativas liberadas não mudam. Dá para desfazer logo em seguida.', 'Limpar o registro');
    if (!ok) return;
    if (mudarDoc(PRE_A + p.id, 'limpar o registro de ' + p.nome, N.normAchados, x => { if (!x.reg.length) return false; x.reg = []; }, naMesa ? p.dono : null))
      avisoDesfazer('O registro de ' + p.nome + ' foi limpo.');
  }
  function secaoRegistro(p) {
    const ach = achados(p.id), simbDoc = doc(SIMB);
    const cab = mestre && ach.reg.length ? h('span', { class: 'row', style: 'gap:8px' }, h('small', { text: 'As meditações e as tentativas' }),
      h('button', { type: 'button', class: 'btn sm', 'data-k': 'reg:limpar', onclick: () => limparRegistro(p) }, 'Limpar o registro')) : h('small', { text: 'As meditações e as tentativas' });
    return secao('Registro', cab, ach.reg.length ? ach.reg.slice(0, 40).map((r, i) => h('div', { class: 'reg', 'data-reg': String(i) },
      h('time', { text: quando(r.em) }),
      r.tipo === 'entrou'
        ? h('span', null, 'Meditou · ', [r.amb ? N.AMB_NOME[r.amb] : '', r.hora ? N.HORA_NOME[r.hora].toLowerCase() : '', r.clima ? climaNome(r.clima).toLowerCase() : ''].filter(Boolean).join(', '), r.por === 'mestre' ? ' (chamado pelo mestre)' : '')
        : h('span', null, N.seqTxt(simbDoc, r.seq), ' · ', r.res ? h('b', { class: 'achou', text: 'descobriu ' + (r.nome || 'uma receita') }) : h('b', { text: 'nada aconteceu' }))))
      : h('p', { class: 'vazio-p', text: 'Nenhuma meditação ainda.' }));
  }
  function secaoTreino(p) {
    const l = N.normTreino(doc(TREINO)).pcs[p.id] || [];
    const somar = (b, d) => { const novo = N.somarTreino(doc(TREINO), p.id, b.id, d); if (novo) mudarDoc(TREINO, (d > 0 ? 'somar um ponto em ' : 'tirar um ponto de ') + b.nome, N.normTreino, x => { x.pcs = novo.pcs; }); };
    const criar = () => {
      const nome = novaBarra.nome.replace(/\s+/g, ' ').trim(), max = Math.trunc(Number(novaBarra.max));
      if (!nome) { toast('Dê um nome à barra.'); return; }
      if (!(max >= 1 && max <= N.MAX.maxBarra)) { toast('A barra enche com 1 a ' + N.MAX.maxBarra + ' pontos.'); return; }
      if (l.length >= N.MAX.barras) { toast('São no máximo ' + N.MAX.barras + ' barras por personagem.'); return; }
      if (mudarDoc(TREINO, 'criar a barra ' + nome, N.normTreino, x => { (x.pcs[p.id] = x.pcs[p.id] || []).push({ id: N.novoId('tb'), nome, max, n: 0 }); }, null, true)) { novaBarra = { nome: '', max: '10' }; pintar(); }
    };
    const tirar = b => { if (mudarDoc(TREINO, 'tirar a barra ' + b.nome, N.normTreino, x => { x.pcs[p.id] = (x.pcs[p.id] || []).filter(y => y.id !== b.id); })) avisoDesfazer('A barra ' + b.nome + ' saiu.'); };
    return secao('Treinamento de ' + p.nome, h('span', { class: 'so-mestre' }, icone(ICO.tranca, 15, '1.9'), 'Só você vê'),
      l.length ? l.map(b => h('div', { class: 'barra' + (b.n >= b.max ? ' completa' : ''), 'data-barra': b.id },
        h('div', { class: 'cab' }, h('b', { text: b.nome }), b.n >= b.max ? h('span', { class: 'tag ouro', text: 'Completa' }) : null,
          h('span', { class: 'num', text: b.n + ' / ' + b.max }),
          h('button', { type: 'button', class: 'ib', 'data-k': 'tb:' + b.id + ':menos', 'aria-label': 'Tirar um ponto de ' + b.nome, disabled: b.n <= 0, onclick: () => somar(b, -1) }, '−'),
          h('button', { type: 'button', class: 'ib', 'data-k': 'tb:' + b.id + ':mais', 'aria-label': 'Somar um ponto em ' + b.nome, disabled: b.n >= b.max, onclick: () => somar(b, 1) }, '+'),
          h('button', { type: 'button', class: 'ib leve', 'data-k': 'tb:' + b.id + ':x', title: 'Tirar a barra', 'aria-label': 'Tirar a barra ' + b.nome, onclick: () => tirar(b) }, '×')),
        h('div', { class: 'trilho' }, h('div', { class: 'cheio', style: 'width:' + Math.round((100 * b.n) / b.max) + '%' })),
        b.cheia ? h('small', { text: 'Encheu em ' + quando(b.cheia) + '. A recompensa é com você, na história.' }) : null))
        : h('p', { class: 'vazio-p', text: 'Nenhuma barra ainda.' }),
      h('div', { class: 'row' },
        h('input', { class: 'in', 'data-k': 'tb:nome', type: 'text', maxlength: N.MAX.nomeBarra, value: novaBarra.nome, placeholder: 'Nome (ex.: Controle do chi)', 'aria-label': 'Nome da barra nova', style: 'flex:1 1 160px;width:auto',
          oninput: function () { novaBarra.nome = this.value; }, onkeydown: ev => { if (ev.key === 'Enter') { ev.preventDefault(); criar(); } } }),
        h('input', { class: 'in', 'data-k': 'tb:max', type: 'number', min: 1, max: N.MAX.maxBarra, value: novaBarra.max, title: 'Quantos pontos enchem a barra', 'aria-label': 'Quantos pontos enchem a barra', style: 'width:84px',
          oninput: function () { novaBarra.max = this.value; } }),
        h('button', { type: 'button', class: 'btn sm', 'data-k': 'tb:nova', onclick: criar }, '+ Barra')));
  }
  function cartaoQuem(p) {
    const ach = p.dono ? achados(p.id) : null, lib = !!ach && ach.lib > ach.feitas, livres = ach ? ach.lib - ach.feitas : 0, ult = ach ? N.ultimaTentativa(doc(PRE_A + p.id)) : null;
    return h('div', { class: 'cartao' + (sel === p.id ? ' sel' : ''), 'data-quem': p.id },
      h('div', { class: 'cab' }, retratoP(p), h('div', { style: 'display:grid;gap:2px;flex:1;min-width:0' }, h('b', { text: p.nome }), h('small', { text: deQuem(p) })),
        h('span', { class: 'estado sim', text: 'Meditando' })),
      p.dono ? h('div', { class: 'row' },
        lib ? h('span', { class: 'tag ok', text: livres > 1 ? livres + ' tentativas liberadas' : 'Tentativa liberada' }) : null,
        lib ? h('button', { type: 'button', class: 'btn sm', 'data-k': 'lib:' + p.id + ':menos', disabled: ocupado, onclick: () => liberar(p.id, -1) }, 'Tirar a tentativa') : null,
        h('button', { type: 'button', class: 'btn sm' + (lib ? '' : ' pri'), 'data-k': 'lib:' + p.id, disabled: ocupado || livres >= 5, onclick: () => liberar(p.id, 1) }, lib ? 'Mais uma' : 'Liberar tentativa'))
        : h('small', { class: 'ajuda', text: 'Sem dono: medita na cena, mas não tenta os pilares.' }),
      ult ? h('span', { class: 'linha-ult', text: 'Última tentativa: ' + N.seqTxt(doc(SIMB), ult.seq) + ' · ' + (ult.res ? 'descobriu ' + (ult.nome || 'uma receita') : 'nada aconteceu') + (ult.em ? ' (' + quando(ult.em) + ')' : '') }) : null,
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn sm', 'data-k': 'ver:' + p.id, 'aria-pressed': String(sel === p.id), onclick: () => { sel = p.id; seqAtual = []; resultado = null; pintar(); } }, 'Ver a prática'),
        h('button', { type: 'button', class: 'btn sm', 'data-k': 'sair:' + p.id, disabled: ocupado, onclick: () => entrar(p.id, false) }, 'Tirar da meditação')));
  }
  function painelMestre() {
    const pcs = personagens(), quem = quemMedita(), meditando = quem.map(id => pcs.find(p => p.id === id)).filter(Boolean);
    if (sel && !pcs.some(p => p.id === sel)) sel = null;
    if (!sel) sel = (meditando[0] || pcs.find(p => p.dono) || pcs[0] || {}).id || null;
    const out = [secao('Quem medita', h('button', { type: 'button', class: 'btn sm', 'data-k': 'chamar', disabled: ocupado || !pcs.some(p => !quem.includes(p.id)), onclick: chamarVarios }, 'Chamar para meditar…'),
      meditando.length ? meditando.map(cartaoQuem) : h('p', { class: 'vazio-p', text: 'Ninguém meditando. Chame os personagens — ou cada jogador entra sozinho, pela aba dele.' }))];
    if (!pcs.length) { out.push(h('p', { class: 'vazio-p', text: naMesa ? 'A mesa ainda não tem personagens. Crie as fichas na aba Fichas.' : 'Sem personagens.' })); return out; }
    const grupos = porCampanha(pcs);
    out.push(h('label', { class: 'rot', style: 'justify-content:space-between' }, 'Ver a prática de',
      h('select', { class: 'in', 'data-k': 'm:pc', value: sel || '', onchange: function () { sel = this.value; seqAtual = []; resultado = null; pintar(); } },
        grupos.length > 1 || (grupos[0] && grupos[0].nome)
          ? grupos.map(g => h('optgroup', { label: g.nome || 'Personagens' }, g.itens.map(p => h('option', { value: p.id, text: p.nome + (quem.includes(p.id) ? ' (meditando)' : '') }))))
          : pcs.map(p => h('option', { value: p.id, text: p.nome + (quem.includes(p.id) ? ' (meditando)' : '') })))));
    const p = pcs.find(x => x.id === sel);
    if (p) {
      out.push(secaoPratica(p), secaoTreino(p));
      if (p.dono) out.push(secaoAchadas(p, true), secaoRegistro(p));
      if (!naMesa) out.push(secaoPilares(p));               // (a página sozinha: dá para experimentar os pilares)
    }
    return out;
  }
  function painelJogador() {
    const ms = meus();
    if (!ms.length) return [h('div', { class: 'vazio' }, h('p', { text: 'Você ainda não tem personagem nesta mesa.' }), h('p', { class: 'ajuda', text: 'Quando o mestre entregar uma ficha a você, a prática dela aparece aqui.' }))];
    if (!sel || !ms.some(p => p.id === sel)) sel = ms[0].id;
    const p = ms.find(x => x.id === sel), noAr = quemMedita().includes(p.id);
    return [
      h('button', { type: 'button', class: 'btn lg' + (noAr ? '' : ' pri'), 'data-k': noAr ? 'sair' : 'meditar', disabled: ocupado, onclick: () => entrar(p.id, !noAr) },
        icone(ICO.medita, 20), noAr ? 'Sair da meditação' : 'Meditar'),
      secaoPratica(p), secaoPilares(p), secaoAchadas(p, false), secaoRegistro(p),
    ];
  }

  /* ---------------- chamar vários de uma vez ---------------- */
  function chamarVarios() {
    const quem = quemMedita(), fora = personagens().filter(p => !quem.includes(p.id));
    if (!fora.length) { toast('Todos os personagens já estão meditando.'); return; }
    const dlg = $('dlg'), marcados = new Set();
    const caixa = p => h('label', { class: 'chk' }, h('input', { type: 'checkbox', 'data-pc': p.id, onchange: function () { if (this.checked) marcados.add(p.id); else marcados.delete(p.id); } }), h('span', { text: p.nome + ' · ' + deQuem(p) }));
    const grupos = porCampanha(fora);
    dlg.onclose = null;
    dlg.replaceChildren(h('h2', { text: 'Chamar para meditar' }), h('p', { text: 'Quem entra na meditação agora? Cada jogador também pode entrar e sair sozinho, pela aba dele.' }),
      h('div', { class: 'lista-esc' }, grupos.map(g => [g.nome ? h('small', { class: 'ajuda', text: g.nome }) : null, g.itens.map(caixa)])),
      h('div', { class: 'pe' }, h('button', { type: 'button', class: 'btn', 'data-k': 'dl:nao', onclick: () => dlg.close() }, 'Cancelar'),
        h('button', { type: 'button', class: 'btn pri', 'data-k': 'dl:sim', onclick: async () => {
          const ids = [...marcados];
          dlg.close();
          if (!ids.length) return;
          const feitos = [];
          await acao(async () => { for (const id of ids) { await pedir('entrar', { pc: id, entrar: true }); feitos.push(id); } });
          if (!feitos.length) return;
          const passo = empilhar(feitos.length > 1 ? 'chamar ' + feitos.length + ' personagens para meditar' : 'chamar ' + ((pcDe(feitos[0]) || {}).nome || 'o personagem') + ' para meditar',
            async () => { for (const id of feitos) await pedir('entrar', { pc: id, entrar: false }); });
          toast(feitos.length > 1 ? feitos.length + ' personagens estão meditando.' : ((pcDe(feitos[0]) || {}).nome || 'O personagem') + ' está meditando.', 'Desfazer', () => desfazer(passo));
        } }, 'Chamar')));
    dlg.showModal();
  }

  /* ---------------- receitas e símbolos (quem mestra) ---------------- */
  function telaReceitas() {
    const rec = N.normReceitas(doc(REC)), simbDoc = doc(SIMB), dup = N.repetidas(rec), pcs = personagens(), ocultos = new Set(N.normSimbolos(simbDoc).ocultos);
    if (recSel && !rec.lista.some(r => r.id === recSel)) recSel = null;
    const r = recSel ? rec.lista.find(x => x.id === recSel) : null;
    const nomePc = id => (pcs.find(p => p.id === id) || {}).nome || '?';
    const lista = h('section', { class: 'rec-lista', 'aria-label': 'Receitas' },
      h('div', { class: 'row' }, h('h2', { class: 'tit' }, 'Receitas ', h('small', { text: String(rec.lista.length) })), h('span', { class: 'grow' }),
        h('button', { type: 'button', class: 'btn pri', 'data-k': 'rc:nova', disabled: rec.lista.length >= N.MAX.receitas, onclick: novaReceita }, '+ Receita')),
      h('p', { class: 'ajuda', text: 'Só você vê as receitas. O jogador descobre combinando os símbolos nos pilares — uma tentativa por vez, quando você libera.' }),
      rec.lista.length ? rec.lista.map(x => {
        const d = dup.find(y => y.id === x.id), antes = d ? rec.lista.find(y => y.id === d.antes) : null;
        const escondido = x.seq.some(id => ocultos.has(id) || N.simbolo(simbDoc, id).sumiu);
        return h('div', { class: 'receita' + (x.id === recSel ? ' sel' : ''), 'data-rc': x.id },
          h('button', { type: 'button', class: 'abrir', 'data-k': 'rc:' + x.id, onclick: () => { recSel = x.id; pilarEd = Math.min(x.seq.length, N.MAX.pilares - 1); pintar(); } },
            h('div', { class: 'cab' }, h('b', { text: x.nome }), h('span', { class: 'seq' }, x.seq.map(id => desenhoDe(N.simbolo(simbDoc, id), 22)))),
            h('small', { text: (x.seq.length ? N.seqTxt(simbDoc, x.seq) : 'sem símbolos ainda') + ' · ' + (x.onde ? 'só em ' + N.AMB_NOME[x.onde] : 'em qualquer ambiente') + ' · ' + (x.quem ? 'para ' + x.quem.map(nomePc).join(', ') : 'para todos') }),
            h('small', { text: descobridores(x.id) })),
          !N.receitaPronta(x) ? h('span', { class: 'aviso-dup', text: 'Com menos de 2 símbolos, ninguém a descobre.' }) : null,
          escondido ? h('span', { class: 'aviso-dup', text: 'Usa um símbolo escondido dos jogadores (ou que não existe mais): ninguém a descobre assim.' }) : null,
          antes ? h('span', { class: 'aviso-dup', text: 'A mesma sequência de "' + antes.nome + '", que vem antes na lista e também vale: esta nunca seria achada.' }) : null);
      }) : h('p', { class: 'vazio-p', text: 'Nenhuma receita ainda.' }));
    const ed = h('section', { class: 'rec-ed', 'aria-label': 'Editar a receita' }, r ? editorReceita(r, simbDoc, pcs) : h('p', { class: 'vazio-p', text: 'Escolha uma receita para editar, ou crie uma.' }));
    return [lista, ed, telaSimbolos(simbDoc)];
  }
  function descobridores(id) {
    const nomes = personagens().filter(p => achados(p.id).achadas.some(a => a.id === id)).map(p => p.nome);
    return nomes.length ? 'Descoberta por ' + nomes.join(', ') : 'Ninguém descobriu ainda';
  }
  function novaReceita() {
    let id = null;
    if (mudarDoc(REC, 'criar uma receita', N.normReceitas, x => { id = N.novoId('rc'); x.lista.push({ id, nome: 'Receita nova', seq: [], efeito: '', onde: null, quem: null }); }, null, true)) {
      recSel = id; pilarEd = 0; pintar();
      setTimeout(() => { const el = document.querySelector('[data-k="rc:nome"]'); if (el) { el.focus(); el.select(); } }, 0);
    }
  }
  function mudarReceita(r, rotulo, fn) { return mudarDoc(REC, rotulo, N.normReceitas, x => { const y = x.lista.find(z => z.id === r.id); if (!y) return false; return fn(y, x); }); }
  function editorReceita(r, simbDoc, pcs) {
    const k = Math.min(pilarEd, r.seq.length, N.MAX.pilares - 1);
    const pilares = h('div', { class: 'pilares', 'data-k': 'rp' }, [0, 1, 2, 3, 4].map(i => {
      const id = r.seq[i], s = id ? N.simbolo(simbDoc, id) : null, alvo = i === k;
      return h('button', { type: 'button', class: 'pilar' + (s ? ' cheio' : '') + (alvo ? ' alvo' : ''), 'data-k': 'rp:' + i, 'aria-pressed': String(alvo), disabled: i > r.seq.length,
        'aria-label': s ? 'Pilar ' + (i + 1) + ': ' + s.nome + ' (escolha outro símbolo abaixo para trocar)' : 'Pilar ' + (i + 1) + ' vazio', onclick: () => { pilarEd = i; pintar(); } },
        h('span', { class: 'pedra' }, s ? desenhoDe(s, 28) : null), h('small', { text: s ? s.nome : i < 2 ? 'vazio' : 'opcional' }));
    }));
    const gs = N.grupos(simbDoc, true);
    if (!gs.some(g => g.id === grupoVisto)) grupoVisto = gs.length ? gs[0].id : 'el';
    const g = gs.find(x => x.id === grupoVisto);
    const porSimbolo = id => mudarReceita(r, 'mudar os pilares da receita', y => { const i = Math.min(pilarEd, y.seq.length, N.MAX.pilares - 1); if (y.seq[i] === id) return false; y.seq[i] = id; pilarEd = Math.min(N.MAX.pilares - 1, i + 1); });
    const jogadores = pcs.filter(p => p.dono || (r.quem && r.quem.includes(p.id)));
    return [
      h('h2', { class: 'tit', text: r.nome }),
      campoTexto('rc:nome', 'Nome', r.nome, v => mudarReceita(r, 'mudar o nome da receita', y => { y.nome = v; }), { max: N.MAX.nomeReceita }),
      h('div', { class: 'field' }, h('span', { text: 'Os pilares, na ordem' }), pilares,
        h('div', { class: 'row' }, h('small', { class: 'ajuda', style: 'flex:1 1 200px', text: 'De 2 a 5 símbolos; a ordem importa. Escolha o pilar e depois o símbolo, abaixo.' }),
          h('button', { type: 'button', class: 'btn sm', 'data-k': 'rp:tirar', disabled: k >= r.seq.length, onclick: () => mudarReceita(r, 'tirar um pilar da receita', y => { if (k >= y.seq.length) return false; y.seq.splice(k, 1); pilarEd = Math.min(k, y.seq.length); }) }, 'Tirar este pilar'))),
      h('div', { class: 'seg', role: 'group', 'aria-label': 'Grupos de símbolos', 'data-k': 'grupos-rc' }, gs.map(x => h('button', { type: 'button', 'data-grupo': x.id, 'aria-pressed': String(x.id === grupoVisto), onclick: () => { grupoVisto = x.id; pintar(); } }, x.nome))),
      h('div', { class: 'simbolos', 'data-k': 'simbolos-rc' }, (g ? g.itens : []).map(s => h('button', { type: 'button', class: 'simb' + (s.oculto ? ' oculto' : ''), 'data-rsimb': s.id,
        title: s.oculto ? 'Escondido dos jogadores: eles não o veem nos pilares' : null, 'aria-label': 'Pôr ' + s.nome + ' no pilar ' + (k + 1), onclick: () => porSimbolo(s.id) }, desenhoDe(s, 24), h('span', { text: s.nome })))),
      campoTexto('rc:efeito', 'O efeito (o que o jogador passa a ver quando acerta)', r.efeito, v => mudarReceita(r, 'mudar o efeito da receita', y => { y.efeito = v; }), { area: true, linhas: 5, max: N.MAX.efeito, ph: 'Ao amanhecer, o calor do primeiro sol percorre o corpo de quem medita…' }),
      h('fieldset', { class: 'grupo' }, h('legend', { text: 'Onde vale' }),
        h('label', { class: 'chk' }, h('input', { type: 'radio', name: 'rc-onde', 'data-k': 'rc:onde-todos', checked: !r.onde, onchange: () => mudarReceita(r, 'a receita valer em qualquer ambiente', y => { y.onde = null; }) }), 'Em qualquer ambiente'),
        h('div', { class: 'row' }, h('label', { class: 'chk' }, h('input', { type: 'radio', name: 'rc-onde', 'data-k': 'rc:onde-um', checked: !!r.onde, onchange: () => mudarReceita(r, 'a receita valer num ambiente só', y => { y.onde = N.normCena(doc(CENA)).amb; }) }), 'Só em'),
          h('select', { class: 'in', 'data-k': 'rc:onde', 'aria-label': 'O ambiente da receita', value: r.onde || N.normCena(doc(CENA)).amb, disabled: !r.onde, onchange: function () { const v = this.value; mudarReceita(r, 'mudar onde a receita vale', y => { y.onde = v; }); } },
            N.AMBIENTES.map(([id, nome]) => h('option', { value: id, text: nome }))))),
      h('fieldset', { class: 'grupo' }, h('legend', { text: 'Para quem' }),
        h('label', { class: 'chk' }, h('input', { type: 'radio', name: 'rc-quem', 'data-k': 'rc:quem-todos', checked: !r.quem, onchange: () => mudarReceita(r, 'a receita valer para todos', y => { y.quem = null; }) }), 'Todos os personagens'),
        h('label', { class: 'chk' }, h('input', { type: 'radio', name: 'rc-quem', 'data-k': 'rc:quem-alguns', checked: !!r.quem, disabled: !jogadores.length,
          onchange: () => mudarReceita(r, 'a receita valer só para alguns', y => { y.quem = jogadores.slice(0, 1).map(p => p.id); }) }), 'Só alguns:'),
        h('div', { class: 'row', style: 'padding-left:24px' }, jogadores.map(p => h('label', { class: 'chk' }, h('input', { type: 'checkbox', 'data-k': 'rc:pc:' + p.id, checked: !!(r.quem && r.quem.includes(p.id)), disabled: !r.quem,
          onchange: function () { const sim = this.checked; mudarReceita(r, 'mudar para quem a receita vale', y => { const l = new Set(y.quem || []); if (sim) l.add(p.id); else l.delete(p.id); if (!l.size) { pintar(); toast('Marque pelo menos um personagem (ou escolha "Todos").'); return false; } y.quem = [...l]; }); } }), p.nome)))),
      h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn per', 'data-k': 'rc:apagar', onclick: () => apagarReceita(r) }, 'Apagar a receita')),
    ];
  }
  async function apagarReceita(r) {
    if (!(await confirmar('Apagar a receita?', '"' + r.nome + '" sai da lista. Quem já a descobriu continua com ela.', 'Apagar'))) return;
    if (mudarDoc(REC, 'apagar a receita ' + r.nome, N.normReceitas, x => { x.lista = x.lista.filter(y => y.id !== r.id); }, null, true)) { recSel = null; pintar(); avisoDesfazer('Receita apagada.'); }
  }
  function telaSimbolos(simbDoc) {
    const s = N.normSimbolos(simbDoc), gs = N.grupos(simbDoc, true);
    const g = gs.find(x => x.id === grupoVisto) || gs[0];
    const alternar = sm => mudarDoc(SIMB, (sm.oculto ? 'mostrar o símbolo ' : 'esconder o símbolo ') + sm.nome, N.normSimbolos, x => { if (sm.oculto) x.ocultos = x.ocultos.filter(y => y !== sm.id); else x.ocultos.push(sm.id); });
    return h('section', { class: 'rec-simb', 'aria-label': 'Símbolos' },
      h('div', { class: 'row' }, h('h2', { class: 'tit', text: 'Símbolos' }), h('span', { class: 'grow' }),
        h('small', { class: 'ajuda', text: 'Os prontos podem ser escondidos dos jogadores; os seus, renomeados e apagados. Os jogadores veem os símbolos (não as receitas).' })),
      h('div', { class: 'seg', role: 'group', 'aria-label': 'Grupos de símbolos', 'data-k': 'grupos-simb' }, gs.map(x => h('button', { type: 'button', 'data-grupo': x.id, 'aria-pressed': String(!!g && x.id === g.id), onclick: () => { grupoVisto = x.id; pintar(); } }, x.nome + ' · ' + x.itens.length))),
      h('div', { class: 'simbolos', 'data-k': 'simbolos-m' }, (g ? g.itens : []).map(sm => h('div', { class: 'simb' + (sm.oculto ? ' oculto' : ''), 'data-msimb': sm.id },
        desenhoDe(sm, 26), h('span', { text: sm.nome }),
        g.id === 'meus'
          ? h('span', { class: 'row', style: 'gap:2px;justify-content:center' }, h('button', { type: 'button', class: 'ib leve', title: 'Renomear', 'aria-label': 'Renomear ' + sm.nome, onclick: () => renomearSimbolo(sm) }, '✎'),
            h('button', { type: 'button', class: 'ib leve', title: 'Apagar', 'aria-label': 'Apagar ' + sm.nome, onclick: () => apagarSimbolo(sm) }, '×'))
          : h('button', { type: 'button', class: 'btn sm mini', 'data-k': 'oc:' + sm.id, onclick: () => alternar(sm) }, sm.oculto ? 'Mostrar' : 'Esconder'))),
        h('button', { type: 'button', class: 'simb novo', 'data-k': 'simb:novo', disabled: s.meus.length >= N.MAX.meus, onclick: novoSimbolo }, '+ Símbolo', h('small', { class: 'ajuda', text: 'nome e desenho, ou uma imagem' }))));
  }
  function novoSimbolo() {
    const dlg = $('dlg');
    let des = 'chave', enviando = false;
    const nome = h('input', { class: 'in', type: 'text', maxlength: N.MAX.nomeSimbolo, placeholder: 'Chave de prata', 'data-k': 'ns:nome', 'aria-label': 'Nome do símbolo' });
    const desenhos = () => h('div', { class: 'simbolos', id: 'ns-des' }, N.DESENHOS.map(d => h('button', { type: 'button', class: 'simb' + (des === d.id ? ' escolhido' : ''), 'data-des': d.id, 'aria-pressed': String(des === d.id),
      onclick: () => { des = d.id; $('ns-des').replaceWith(desenhos()); } }, icone(d.d, 22), h('span', { text: d.nome }))));
    const nomeOk = () => { const n = String(nome.value || '').replace(/\s+/g, ' ').trim(); if (!n) { toast('Dê um nome ao símbolo.'); nome.focus(); } return n; };
    const criar = (n, img) => {
      if (dlg.open) dlg.close();
      if (mudarDoc(SIMB, 'criar o símbolo ' + n, N.normSimbolos, x => { x.meus.push({ id: N.novoId('sm'), nome: n, des: img ? null : des, img: img || null }); }, null, true)) { grupoVisto = 'meus'; pintar(); avisoDesfazer('Símbolo criado: ' + n + '.'); }
    };
    // (a imagem é escolhida por um campo de arquivo de dentro da janela: com ela aberta, o resto da página não responde)
    const btImg = h('button', { type: 'button', class: 'btn', 'data-k': 'ns:img' }, 'Usar uma imagem…');
    const arq = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', hidden: true, onchange: async function () {
      const f = this.files && this.files[0], n = String(nome.value || '').replace(/\s+/g, ' ').trim();
      if (!f || !n || enviando) return;
      enviando = true; btImg.disabled = true; btImg.textContent = naMesa ? 'Enviando…' : 'Preparando…';
      try { criar(n, await prepararImagem(f, 240)); }
      catch (e) { toast((e && e.message) || 'Não deu para usar esta imagem.'); }
      finally { enviando = false; btImg.disabled = false; btImg.textContent = 'Usar uma imagem…'; }
    } });
    btImg.onclick = () => { if (nomeOk()) { arq.value = ''; arq.click(); } };
    dlg.onclose = null;
    dlg.replaceChildren(h('h2', { text: 'Símbolo novo' }), h('label', { class: 'field' }, h('span', { text: 'Nome' }), nome), h('p', { style: 'margin:12px 0 6px', text: 'O desenho:' }), desenhos(), arq,
      h('div', { class: 'pe' }, h('button', { type: 'button', class: 'btn', 'data-k': 'ns:nao', onclick: () => dlg.close() }, 'Cancelar'), btImg,
        h('button', { type: 'button', class: 'btn pri', 'data-k': 'ns:criar', onclick: () => { const n = nomeOk(); if (n) criar(n, null); } }, 'Criar')));
    dlg.showModal(); nome.focus();
  }
  function renomearSimbolo(sm) {
    const dlg = $('dlg'), campo = h('input', { class: 'in', type: 'text', maxlength: N.MAX.nomeSimbolo, value: sm.nome, 'data-k': 'rs:nome', 'aria-label': 'Nome do símbolo' });
    const salvar = () => { const n = String(campo.value || '').replace(/\s+/g, ' ').trim(); if (!n) { toast('Dê um nome ao símbolo.'); return; } dlg.close(); mudarDoc(SIMB, 'renomear o símbolo ' + sm.nome, N.normSimbolos, x => { const y = x.meus.find(z => z.id === sm.id); if (!y || y.nome === n) return false; y.nome = n; }); };
    campo.onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); salvar(); } };
    dlg.onclose = null;
    dlg.replaceChildren(h('h2', { text: 'Renomear o símbolo' }), campo, h('div', { class: 'pe' }, h('button', { type: 'button', class: 'btn', onclick: () => dlg.close() }, 'Cancelar'),
      h('button', { type: 'button', class: 'btn pri', 'data-k': 'rs:salvar', onclick: salvar }, 'Salvar')));
    dlg.showModal(); campo.focus(); campo.select();
  }
  async function apagarSimbolo(sm) {
    const usada = N.normReceitas(doc(REC)).lista.filter(r => r.seq.includes(sm.id)).map(r => r.nome);
    if (!(await confirmar('Apagar o símbolo?', usada.length ? '"' + sm.nome + '" está em ' + (usada.length > 1 ? usada.length + ' receitas' : 'uma receita') + ': ' + usada.join(', ') + '. Elas ficam com um símbolo que não existe mais (ninguém as descobre até você trocar).' : '"' + sm.nome + '" sai da lista.', 'Apagar'))) return;
    if (mudarDoc(SIMB, 'apagar o símbolo ' + sm.nome, N.normSimbolos, x => { x.meus = x.meus.filter(y => y.id !== sm.id); })) avisoDesfazer('Símbolo apagado.');
  }

  /* ---------------- imagens ---------------- */
  /* (lote 7) A imagem meditando, com a transparência: sem fundo por baixo, sem as margens vazias em volta do personagem
     (o que é transparente nas bordas sai), em WebP (ou PNG, no navegador que não faz WebP). */
  async function reduzirFigura(arq, lado) {
    let fonte, w, hh, fechar = () => {};
    try { const b = await createImageBitmap(arq); fonte = b; w = b.width; hh = b.height; fechar = () => { try { b.close(); } catch (e) { /* já fechada */ } }; }
    catch (e) {
      const u = URL.createObjectURL(arq);
      fechar = () => URL.revokeObjectURL(u);
      fonte = await new Promise((ok, falha) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => falha(new Error('Não deu para ler esta imagem.')); im.src = u; });
      w = fonte.naturalWidth; hh = fonte.naturalHeight;
    }
    try {
      if (!w || !hh) throw new Error('Não deu para ler esta imagem.');
      const k = Math.min(1, lado / Math.max(w, hh)), cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(hh * k));
      const cx = cv.getContext('2d', { willReadFrequently: true });
      cx.drawImage(fonte, 0, 0, cv.width, cv.height);
      const caixa = caixaVisivel(cx.getImageData(0, 0, cv.width, cv.height));
      let saida = cv;
      if (caixa && (caixa.w < cv.width || caixa.h < cv.height)) {
        saida = document.createElement('canvas'); saida.width = caixa.w; saida.height = caixa.h;
        saida.getContext('2d').drawImage(cv, caixa.x, caixa.y, caixa.w, caixa.h, 0, 0, caixa.w, caixa.h);
      }
      let blob = await new Promise(r => saida.toBlob(r, 'image/webp', 0.92));
      if (!blob || blob.type !== 'image/webp') blob = await new Promise(r => saida.toBlob(r, 'image/png'));
      if (!blob) throw new Error('Não deu para preparar esta imagem.');
      return blob;
    } finally { fechar(); }
  }
  // A caixa do que aparece (alfa acima de quase nada), com 2 pixels de folga; null = nada aparece.
  function caixaVisivel(img) {
    const { width: w, height: hh, data } = img;
    let x0 = w, y0 = hh, x1 = -1, y1 = -1;
    for (let y = 0; y < hh; y++) {
      const linha = y * w * 4;
      for (let x = 0; x < w; x++) if (data[linha + x * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; y1 = y; }
    }
    if (x1 < 0) return null;
    x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(w - 1, x1 + 2); y1 = Math.min(hh - 1, y1 + 2);
    return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }
  async function prepararFigura(arq) {
    if (!/^image\/(png|jpeg|webp)$/.test(arq.type || '')) throw new Error('Escolha uma imagem PNG, JPG ou WebP.');
    const blob = await reduzirFigura(arq, naMesa ? 1400 : 700);
    if (naMesa) return TC.arquivos.subir(blob);
    return new Promise((ok, falha) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => falha(r.error || new Error('Não deu para ler esta imagem.')); r.readAsDataURL(blob); });
  }
  async function reduzir(arq, lado, tipo) {
    let fonte, w, hh, fechar = () => {};
    try { const b = await createImageBitmap(arq); fonte = b; w = b.width; hh = b.height; fechar = () => { try { b.close(); } catch (e) { /* já fechada */ } }; }
    catch (e) {
      const u = URL.createObjectURL(arq);
      fechar = () => URL.revokeObjectURL(u);
      fonte = await new Promise((ok, falha) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => falha(new Error('Não deu para ler esta imagem.')); im.src = u; });
      w = fonte.naturalWidth; hh = fonte.naturalHeight;
    }
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
  // a imagem pronta para guardar: enviada à mesa (o endereço), ou, fora de uma mesa, embutida
  async function prepararImagem(arq, lado) {
    if (!/^image\/(png|jpeg|webp)$/.test(arq.type || '')) throw new Error('Escolha uma imagem PNG, JPG ou WebP.');
    const blob = await reduzir(arq, lado, 'image/jpeg');
    if (naMesa) return TC.arquivos.subir(blob);
    return new Promise((ok, falha) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => falha(r.error || new Error('Não deu para ler esta imagem.')); r.readAsDataURL(blob); });
  }
  let paraImagem = null;
  function escolherImagem(alvo) { paraImagem = alvo; const inp = $('arquivo'); inp.value = ''; inp.click(); }
  async function usarImagem(arq) {
    const alvo = paraImagem; paraImagem = null;
    if (!arq || !alvo) return;
    $('salvo').textContent = naMesa ? 'Enviando a imagem…' : 'Preparando a imagem…';
    try {
      if (alvo.para === 'figura') {
        const url = await prepararFigura(arq);
        $('salvo').textContent = '';
        const p = pcDe(alvo.pc);
        if (p && mudarFigura(p, url, figuraDe(p) ? 'trocar a imagem meditando' : 'pôr a imagem meditando')) avisoDesfazer('A imagem meditando de ' + p.nome + ' aparece na cena para todos.');
        return;
      }
      const url = await prepararImagem(arq, naMesa ? 2400 : 1600);
      $('salvo').textContent = '';
      if (alvo.para === 'fundo') { if (mudarDoc(CENA, 'usar uma imagem sua na cena', N.normCena, x => { x.img = url; })) avisoDesfazer('A cena usa a sua imagem. O ambiente escolhido continua valendo para as receitas.'); }
    } catch (e) { $('salvo').textContent = ''; toast((e && e.message) || 'Não deu para usar esta imagem.'); }
  }
  $('arquivo').addEventListener('change', function () { usarImagem(this.files && this.files[0]); });

  /* ---------------- pintar ---------------- */
  function pintar() {
    if (!pronto) return;
    if (pintando) { pendente = true; return; }
    pintando = true; pendente = false;
    try { pintarJa(); } finally { pintando = false; }
    if (pendente) setTimeout(pintar, 0);
  }
  function pintarJa() {
    const bt = $('btDesfazer');
    bt.disabled = !pilha.length;
    bt.title = pilha.length ? 'Desfazer: ' + pilha[pilha.length - 1].rotulo + ' (Ctrl+Z)' : 'Nada para desfazer';
    morphEm($('barra'), barra());
    const rec = mestre && vista === 'receitas';
    $('work').hidden = rec; $('receitas').hidden = !rec;
    if (rec) { morphEm($('receitas'), telaReceitas()); return; }
    pintarCena();
    pintarAmbientes();
    morphEm($('painel'), mestre ? painelMestre() : painelJogador());
  }

  /* ---------------- avisos e janelas ---------------- */
  function toast(texto, acaoTxt, fn, ms) {
    const caixa = $('toasts');
    while (caixa.children.length >= 3) caixa.firstElementChild.remove();
    const t = h('div', { class: 'toast', role: 'status' }, h('span', { text: texto }));
    if (acaoTxt) t.append(h('button', { type: 'button', text: acaoTxt, onclick: () => { t.remove(); fn(); } }));
    caixa.append(t);
    setTimeout(() => t.remove(), ms || (acaoTxt ? 8000 : 4500));
  }
  function avisoDesfazer(texto) { const passo = pilha[pilha.length - 1]; toast(texto, 'Desfazer', () => desfazer(passo)); }
  function confirmar(titulo, texto, ok) {
    return new Promise(resolve => {
      const dlg = $('dlg');
      let feito = false;
      const fim = v => { if (feito) return; feito = true; dlg.onclose = null; if (dlg.open) dlg.close(); resolve(v); };
      dlg.replaceChildren(h('h2', { text: titulo }), h('p', { text: texto }),
        h('div', { class: 'pe' }, h('button', { type: 'button', class: 'btn', 'data-k': 'dl:nao', onclick: () => fim(false) }, 'Cancelar'),
          h('button', { type: 'button', class: 'btn pri', 'data-k': 'dl:sim', onclick: () => fim(true) }, ok || 'OK')));
      dlg.onclose = () => fim(false);
      dlg.showModal();
      dlg.querySelector('[data-k="dl:sim"]').focus();
    });
  }

  /* ---------------- teclas ---------------- */
  $('btDesfazer').addEventListener('click', () => desfazer());
  const escrevendo = () => { const a = document.activeElement; return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable); };
  document.addEventListener('keydown', ev => {
    if ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && !ev.altKey && ev.key.toLowerCase() === 'z' && !escrevendo() && !$('dlg').open) { ev.preventDefault(); desfazer(); }
  });

  /* ---------------- partida ---------------- */
  async function partida() {
    const TCx = window.TC;
    lerLocal();
    if (TCx && TCx.ponte) {
      st = await TCx.ponte.pronta;
      if (TCx.ponte.naCasca) document.documentElement.classList.add('na-casca');
      if (TCx.dados && TCx.dados.disponivel()) {
        naMesa = true;
        eu = st.eu || null;
        mestre = st.papel === 'mestre';
        D = TCx.dados.col('documentos'); P = TCx.dados.col('personagens');
        await Promise.all([D.pronta, P.pronta]);
      }
      TCx.ponte.aoMudar(e => { const antes = j((st && st.membros) || []); st = e; if (pronto && antes !== j(e.membros || [])) pintar(); });
    }
    if (naMesa) {
      D.aoMudar(l => { if (l && typeof l.id === 'string' && (l.id.startsWith('medit:') || l.id === 'mundo:indice' || l.id.startsWith('mundo:pub:'))) pintar(); });
      P.aoMudar(() => pintar());
    } else $('salvo').textContent = 'Neste navegador';
    montarPalco();
    pronto = true;
    pintar();
    if (TCx && TCx.ponte && TCx.ponte.aoIr) TCx.ponte.aoIr(irAlvo);
  }
  /* (lote 7, parte 6) A busca rápida do site pediu uma receita: quem mestra abre "Receitas e símbolos" com ela no
     editor; quem joga vê, na prática do personagem, a receita que ele descobriu. Ela fica marcada por um instante. */
  function irAlvo(a) {
    if (!a || !pronto) return;
    let alvo = null;
    if (typeof a.receita === 'string' && mestre) {
      const r = N.normReceitas(doc(REC)).lista.find(x => x.id === a.receita);
      if (!r) { toast('Esta receita não existe mais.'); return; }
      recSel = r.id; pilarEd = Math.min(r.seq.length, N.MAX.pilares - 1);
      if (vista !== 'receitas') trocarVista('receitas'); else pintar();
      alvo = '[data-rc="' + CSS.escape(r.id) + '"]';
    } else if (typeof a.achado === 'string') {
      const pcs = mestre ? personagens() : meus();
      if (typeof a.pc === 'string' && pcs.some(p => p.id === a.pc) && sel !== a.pc) { sel = a.pc; seqAtual = []; resultado = null; }
      if (mestre && vista !== 'cena') trocarVista('cena'); else pintar();
      alvo = '[data-achada="' + CSS.escape(a.achado) + '"]';
    } else return;
    const el = document.querySelector(alvo);
    if (!el) { toast('Esta receita não está mais na lista.'); return; }
    el.scrollIntoView({ block: 'nearest' });
    el.classList.add('achado');
    setTimeout(() => el.classList.remove('achado'), 2400);
  }
  if (DEBUG) window.__medit = { N, get naMesa() { return naMesa; }, get mestre() { return mestre; }, get pronto() { return pronto; }, get pilha() { return pilha.map(p => p.rotulo); }, get sel() { return sel; }, get seq() { return seqAtual.slice(); },
    doc: id => copia(doc(id)), pintar, desfazer: () => desfazer() };
  partida().catch(e => {
    console.error(e);
    $('painel').replaceChildren(h('div', { class: 'vazio' }, h('strong', { text: 'Não deu para abrir a meditação da mesa. ' }), (e && e.message) || '', ' ',
      h('button', { type: 'button', class: 'btn sm', text: 'Tentar de novo', onclick: () => location.reload() })));
  });
})();
