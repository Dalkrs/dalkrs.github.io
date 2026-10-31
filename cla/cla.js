/* Tiny Cats · Clã: a página.
   Os clãs da mesa: o dos jogadores (eles veem tudo dele, e o dono do personagem que ocupa o cargo de líder cria,
   renomeia, move e preenche os outros cargos) e os de NPC — rivais, aliados —, de que o mestre escolhe o que os
   jogadores veem, parte por parte. Quem joga vê o salão do clã: a hierarquia, as construções, os recursos, o respeito no
   mundo e as relações, o histórico. Quem mestra o Clã tem o painel dos clãs (o brasão, o que os jogadores veem, os
   cargos, as construções — subir de nível desconta os recursos —, os recursos, o respeito, as relações, o respeito de
   cada membro, o histórico) e vê o salão como os jogadores o veem.
   Na mesa, quem mestra grava o clã inteiro (cla:c:<id>) e o banco monta sozinho o que os jogadores recebem
   (cla:pub:<id>; ver supabase/migrations/0018_cla.sql); o líder mexe nos cargos por uma função do banco. Fora de uma
   mesa (a página sozinha), tudo fica neste navegador e a página faz a mesma conta do banco para mostrar o salão. */
(() => {
  'use strict';
  const N = window.ClaNucleo;
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
  const ICO = {
    tranca: 'M5 11h14v10H5zM8 11V8a4 4 0 0 1 8 0v3',
    coroa: 'M4 18h16M4 18 3 7l5 4 4-6 4 6 5-4-1 11',
    lapis: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  };
  const guarda = {
    ler(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    gravar(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  };
  const imagemOk = v => typeof v === 'string' && (/^https:\/\/[^\s"'<>]+$/i.test(v) || /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v));
  const dia = iso => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); };
  const agora = () => new Date().toISOString();
  const iniciais = nome => String(nome || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toUpperCase() || '?';
  const tom = v => (v > 0 ? 'pos' : v < 0 ? 'neg' : 'zero');

  /* ---------------- pintar por cima (morph): o campo em que se escreve não sai do lugar ---------------- */
  const PROPS = ['onclick', 'onchange', 'oninput', 'onkeydown', 'ondragstart', 'ondragend', 'ondragover', 'ondragleave', 'ondrop', 'onpointerdown'];
  const textual = el => el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|reset|file|range|color)$/i.test(el.type || ''));
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
  const PRE_C = 'cla:c:', PRE_P = 'cla:pub:', NOMES = 'cla:nomes', L_DOCS = 'tinycats:cla:local', PC_TESTE = 'pc_teste';
  const PRE_SEDE = 'cla:sede:';                                     // (lote 30) a sede de um clã
  let st = null, D = null, P = null, naMesa = false, mestre = true, eu = null, pronto = false;
  let vista = guarda.ler('tinycats:cla:vista') === 'salao' ? 'salao' : 'mestre';
  let sel = null, aba = 'hier', ocupado = false, verTudo = false;
  const motivos = { rec: '', resp: '', rel: '', membro: '' };     // o motivo da próxima mudança, em cada parte do painel
  let pilha = [];                                                   // o desfazer: { rotulo, desfazer() }
  let pintando = false, pendente = false, local = {}, tSalvo = 0, arrasto = null;
  let sedeAberta = null;                                            // (lote 30) o clã com a Sede aberta (quem mestra)

  function lerLocal() { try { const d = JSON.parse(guarda.ler(L_DOCS) || 'null'); local = ehObj(d) ? d : {}; } catch (e) { local = {}; } }
  function salvarLocal() { if (!guarda.gravar(L_DOCS, j(local))) toast('Não deu para guardar neste navegador (a imagem pode ser grande demais para ele).'); }
  function doc(id) {
    if (!naMesa) return local[id] == null ? null : local[id];
    const l = D && D.pegar(id);
    return l && !l.apagado ? l.dados : null;
  }
  // (a visibilidade vai só quando o documento nasce: o clã inteiro é só de quem mestra; os nomes dos níveis, da mesa)
  // (lote 30) a sede: da mesa no clã dos jogadores e no de NPC que o mestre mostrou; senão, só de quem mestra — e muda
  // quando isso muda
  function visDe(id, dados) {
    if (id === NOMES) return 'mesa';
    if (id.startsWith(PRE_SEDE)) { const x = clasMestre().find(y => y.id === id.slice(PRE_SEDE.length)); return (x && x.c.jogadores) || (dados && dados.mostrar === true) ? 'mesa' : 'mestre'; }
    return 'mestre';
  }
  function gravarDoc(id, dados) {
    if (naMesa) {
      const campos = { dados: copia(dados) }, l = D.pegar(id), vis = visDe(id, dados);
      if (!l || (id.startsWith(PRE_SEDE) && l.vis !== vis)) campos.vis = vis;
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
  function mudarDoc(id, rotulo, norm, fn, quieto) {
    const antes = norm(copia(doc(id))), novo = norm(copia(doc(id)));
    if (fn(novo) === false) return false;
    const depois = norm(novo);
    if (j(depois) === j(antes)) return false;
    gravarDoc(id, depois);
    empilhar(rotulo, () => gravarDoc(id, norm(juntar3(depois, antes, norm(copia(doc(id)))))));
    if (!quieto) pintar();
    return true;
  }
  const mudarCla = (id, rotulo, fn, quieto) => mudarDoc(PRE_C + id, rotulo, N.normCla, fn, quieto);
  // (as contas do núcleo devolvem o clã novo; aqui ele entra no lugar da cópia)
  const trocar = (c, novo) => { if (!novo) return false; for (const k of Object.keys(c)) delete c[k]; Object.assign(c, novo); return true; };
  function empilhar(rotulo, desfazer) { pilha.push({ rotulo, desfazer }); if (pilha.length > 120) pilha.shift(); return pilha[pilha.length - 1]; }
  function desfazer(passo) {
    if (passo && pilha[pilha.length - 1] !== passo) { toast('Já houve outra mudança depois. Use o botão Desfazer, lá em cima.'); return; }
    const p = pilha.pop();
    if (!p) return;
    Promise.resolve().then(p.desfazer).then(() => { pintar(); toast('Desfeito: ' + p.rotulo + '.'); }, e => { pintar(); toast((e && e.message) || 'Não deu para desfazer.'); });
  }

  /* ---------------- os clãs ---------------- */
  const ordenar = l => l.sort((a, b) => (b.c.jogadores ? 1 : 0) - (a.c.jogadores ? 1 : 0) || a.c.ordem - b.c.ordem || a.c.nome.localeCompare(b.c.nome, 'pt-BR'));
  const idDe = (k, pre) => (typeof k === 'string' && k.startsWith(pre) && /^[A-Za-z0-9_-]{1,40}$/.test(k.slice(pre.length)) ? k.slice(pre.length) : null);
  // o clã inteiro de cada um (quem mestra): [{ id, c }]
  function clasMestre() {
    const out = [];
    if (naMesa) { for (const l of D.todas()) { const id = idDe(l.id, PRE_C); if (id && !l.apagado && ehObj(l.dados)) out.push({ id, c: N.normCla(l.dados) }); } }
    else for (const k of Object.keys(local)) { const id = idDe(k, PRE_C); if (id && ehObj(local[k])) out.push({ id, c: N.normCla(local[k]) }); }
    return ordenar(out);
  }
  // fora da mesa, a mesma conta do banco: o que os jogadores receberiam de cada clã
  const crus = () => clasMestre().map(x => Object.assign({ id: x.id }, x.c));
  function pubDe(id) {
    if (naMesa) return N.normPub(doc(PRE_P + id));
    const todos = crus(), cla = todos.find(x => x.id === id);
    return cla ? N.normPub(N.projetar(cla, todos)) : null;
  }
  // o que os jogadores veem: [{ id, c }] (c: o clã como eles o recebem)
  function clasDosJogadores() {
    const out = [];
    if (naMesa) { for (const l of D.todas()) { const id = idDe(l.id, PRE_P); const c = id && !l.apagado ? N.normPub(l.dados) : null; if (c) out.push({ id, c: Object.assign(c, { id }) }); } }
    else for (const x of crus()) { const c = N.normPub(N.projetar(x, crus())); if (c) out.push({ id: x.id, c: Object.assign(c, { id: x.id }) }); }
    return ordenar(out);
  }
  const nomes = () => N.normNomes(doc(NOMES));
  // as facções dos mapas do Mapa-múndi (para a referência do clã e as relações): [{ id, nome, cor, oculta, mapa }]
  function faccoesDoMundo() {
    if (!naMesa) return [];
    const out = [];
    for (const l of D.todas()) {
      if (typeof l.id !== 'string' || !l.id.startsWith('mundo:mapa:') || l.apagado || !ehObj(l.dados) || !Array.isArray(l.dados.faccoes)) continue;
      for (const f of l.dados.faccoes) {
        if (!ehObj(f) || typeof f.id !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(f.id) || out.some(x => x.id === f.id)) continue;
        out.push({ id: f.id, nome: String(f.nome || '').trim().slice(0, 60) || 'Facção', cor: /^#[0-9a-fA-F]{6}$/.test(f.cor || '') ? f.cor.toLowerCase() : null, oculta: !!f.oculta, mapa: String(l.dados.nome || '').slice(0, 60) });
      }
    }
    return out.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  /* ---------------- quem é quem ---------------- */
  function personagens() {
    if (!naMesa) return [{ id: PC_TESTE, nome: 'Personagem de teste', dono: 'local', img: null, campanha: null }];
    return P.todas().filter(l => !l.apagado && typeof l.id === 'string' && String(l.nome || '').trim())
      .map(l => { const f = ehObj(l.ficha) ? l.ficha : {}; return { id: l.id, nome: String(l.nome).trim(), dono: l.dono_id || null, campanha: l.campanha || null, img: imagemOk(f.img) ? f.img : null }; })
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }
  const pcDe = id => personagens().find(p => p.id === id) || null;
  function nomeDoMembro(uid) { const m = st && Array.isArray(st.membros) ? st.membros.find(x => x.id === uid) : null; return m ? m.nome : ''; }
  // como uma pessoa de um cargo aparece: o nome (o do personagem de agora, quando ele chega a quem vê) e de quem é
  function quemE(p) {
    const pc = p.pc ? pcDe(p.pc) : null;
    const de = !pc ? '' : !pc.dono ? 'NPC' : !naMesa ? 'teste' : pc.dono === eu ? 'você' : nomeDoMembro(pc.dono) || 'jogador';
    return { nome: (pc && pc.nome) || p.nome || 'Alguém', de, img: pc ? pc.img : null, pj: !!(pc && pc.dono) };
  }
  // quem usa é o líder deste clã (o clã dos jogadores; o personagem no cargo de líder é dele)
  function souLider(c) {
    if (!naMesa || mestre || !c || !c.jogadores || !c.cargos) return false;
    const l = c.cargos.lider.gente[0], pc = l && l.pc ? pcDe(l.pc) : null;
    return !!pc && !!eu && pc.dono === eu;
  }
  function porCampanha(itens) {
    const T = window.TC && TC.ponte;
    return naMesa && T && typeof T.porCampanha === 'function' ? T.porCampanha(itens, p => p.campanha) : [{ id: '', nome: '', itens }];
  }

  /* ---------------- o brasão e o salão ---------------- */
  // o brasão num elemento: a imagem do mestre, ou o desenho (um <svg> feito pelo núcleo, só com números e cores conferidos)
  function brasaoEl(b, sufixo, cls) {
    const x = N.normBrasao(b);
    if (x.img) return h('span', { class: cls || null }, h('img', { src: x.img, alt: '' }));
    const s = h('span', { class: cls || null });
    s.innerHTML = N.brasaoSvg(x, sufixo);
    return s;
  }
  // o salão: a parede, os arcos, as duas bandeiras com o brasão, a mesa comprida e os braseiros (desenho fixo, deste site)
  function salaoSvg(b) {
    const x = N.normBrasao(b), [c1, c2] = x.cores;
    const emblema = tx => (x.img ? `<image href="${x.img}" x="16" y="30" width="88" height="106" preserveAspectRatio="xMidYMid meet"/>`
      : N.brasaoSvg(x, 'sl' + tx).replace('<svg viewBox="0 0 100 120"', '<svg x="16" y="30" width="88" height="106" viewBox="0 0 100 120"'));
    const bandeira = tx => `<g transform="translate(${tx} 10)"><path d="M0 0H120V190L60 165L0 190Z" fill="${c1}"/><path d="M0 0H120V12H0Z" fill="${c2}"/><path d="M0 12H120" stroke="rgba(0,0,0,.25)" stroke-width="2"/>${emblema(tx)}</g>`;
    const braseiro = tx => `<g transform="translate(${tx} 210)"><path d="M-30 0H30L20 26H-20Z" fill="#2a2420"/><path d="M-6 52H6V26H-6Z" fill="#2a2420"/><path d="M-18 0C-14 -26 -4 -20 0 -40C4 -20 14 -26 18 0Z" fill="#ff9a3c"/><path d="M-8 0C-6 -14 0 -12 0 -24C2 -12 8 -14 8 0Z" fill="#ffe08a"/><circle r="90" fill="url(#slLuz)"/></g>`;
    return `<svg viewBox="0 0 1440 330" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`
      + `<defs><linearGradient id="slParede" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#15131b"/><stop offset="1" stop-color="#2b2532"/></linearGradient>`
      + `<radialGradient id="slLuz" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffb35c" stop-opacity=".55"/><stop offset="1" stop-color="#ffb35c" stop-opacity="0"/></radialGradient>`
      + `<linearGradient id="slChao" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2f2a"/><stop offset="1" stop-color="#1d1816"/></linearGradient></defs>`
      + `<rect width="1440" height="330" fill="url(#slParede)"/>`
      + `<g fill="#100e14" opacity=".9"><path d="M80 330V110C80 60 150 30 210 30S340 60 340 110V330H300V120C300 85 260 66 210 66S120 85 120 120V330Z"/><path d="M1100 330V110C1100 60 1170 30 1230 30S1360 60 1360 110V330H1320V120C1320 85 1280 66 1230 66S1140 85 1140 120V330Z"/></g>`
      + `<g stroke="#241f2b" stroke-width="2" opacity=".7"><path d="M0 70H1440M0 140H1440M0 210H1440"/><path d="M120 0V70M380 0V70M640 0V70M900 0V70M1160 0V70M250 70V140M510 70V140M770 70V140M1030 70V140M1290 70V140"/></g>`
      + `<path d="M0 262H1440V330H0Z" fill="url(#slChao)"/><path d="M0 262H1440" stroke="#4a3d34" stroke-width="3"/>`
      + bandeira(470) + bandeira(850)
      + `<path d="M430 232H1010L1050 262H390Z" fill="#5a3f2e"/><path d="M390 262H1050V272H390Z" fill="#3b291f"/><path d="M420 272V310M1020 272V310M560 272V300M880 272V300" stroke="#2c1f18" stroke-width="10"/>`
      + `<g fill="#f3e6c8"><rect x="560" y="214" width="8" height="20"/><rect x="716" y="210" width="8" height="24"/><rect x="872" y="214" width="8" height="20"/></g>`
      + `<g fill="#ffcf73"><ellipse cx="564" cy="209" rx="4" ry="7"/><ellipse cx="720" cy="205" rx="4" ry="7"/><ellipse cx="876" cy="209" rx="4" ry="7"/></g>`
      + `<circle cx="720" cy="220" r="160" fill="url(#slLuz)"/>` + braseiro(210) + braseiro(1230) + `</svg>`;
  }

  /* ---------------- o que passa pelo banco (o líder e os cargos) ---------------- */
  async function acao(fn) {
    if (ocupado) return null;
    ocupado = true; pintar();
    try { const r = await fn(); return r == null ? true : r; }
    catch (e) { toast((e && e.message) || 'Não deu certo agora. Tente de novo.'); return null; }
    finally { ocupado = false; pintar(); }
  }
  function pedirCargos(cla, mudar, txt) {
    if (!window.TC || !TC.ponte || typeof TC.ponte.cla !== 'function') return Promise.reject(new Error('Esta página está desatualizada: recarregue o site.'));
    return TC.ponte.cla('cargos', { cla, mudar, txt });
  }
  const semResp = c => (c ? j(Object.assign({}, c, { gente: c.gente.map(p => ({ id: p.id, pc: p.pc, nome: p.nome })) })) : 'null');
  /* Mudar os cargos de um clã. Quem mestra grava o clã (com uma linha no histórico); o líder pede ao banco só o que
     mudou, e o desfazer pede a volta — se ninguém mexeu nesses cargos depois. fn recebe os cargos e devolve os novos
     (ou null: nada a fazer). txt: o que vai para o histórico ("criou o cargo Batedores"). */
  async function mudarCargos(c, rotulo, txt, fn) {
    if (mestre) {
      return mudarCla(c.id, rotulo, x => {
        const novos = fn(copia(x.cargos));
        if (!novos) return false;
        x.cargos = novos;
        x.hist = N.anotar(x.hist, { em: agora(), tipo: 'cargo', txt: 'O mestre: ' + txt + '.' }, N.MAX.hist);
      });
    }
    const antes = N.normCargos(c.cargos), depois = fn(copia(antes));
    if (!depois) return false;
    const mudar = N.diffCargos(antes, depois), volta = N.diffCargos(depois, antes);
    if (!Object.keys(mudar).length) return false;
    if ((await acao(() => pedirCargos(c.id, mudar, txt))) === null) return false;
    const fim = N.normCargos(depois);
    empilhar(rotulo, async () => {
      const agoraC = clasDosJogadores().find(x => x.id === c.id), cs = agoraC && agoraC.c.cargos ? N.normCargos(agoraC.c.cargos) : null;
      if (!cs || Object.keys(volta).some(k => semResp(cs[k]) !== semResp(fim[k]))) throw new Error('Os cargos já mudaram de novo depois disso: desfazer agora passaria por cima da mudança de outra pessoa.');
      await pedirCargos(c.id, volta, 'desfez a última mudança nos cargos');
    });
    return true;
  }

  /* ---------------- a barra de cima ---------------- */
  function barra() {
    const out = [];
    if (mestre) out.push(h('div', { class: 'seg', role: 'group', 'aria-label': 'O que ver', id: 'vistas' },
      h('button', { type: 'button', 'data-vista': 'mestre', 'aria-pressed': String(vista === 'mestre'), onclick: () => trocarVista('mestre') }, 'Mestre'),
      h('button', { type: 'button', 'data-vista': 'salao', 'aria-pressed': String(vista === 'salao'), onclick: () => trocarVista('salao') }, 'O salão (como os jogadores veem)')));
    if (!mestre || vista === 'salao') {
      const clas = mestre ? clasMestre() : clasDosJogadores();
      if (clas.length > 1 || (mestre && clas.length)) out.push(h('div', { class: 'seg', role: 'group', 'aria-label': 'Clãs', id: 'escolhaCla' },
        clas.map(x => h('button', { type: 'button', 'data-cla': x.id, 'aria-pressed': String(x.id === sel), onclick: () => escolher(x.id) }, x.c.nome + (!mestre && x.c.jogadores ? ' (o seu)' : '')))));
    }
    return out;
  }
  function trocarVista(v) { vista = v; guarda.gravar('tinycats:cla:vista', v); pintar(); }
  function escolher(id) { if (sel !== id) { sel = id; aba = 'hier'; verTudo = false; } pintar(); }

  /* ---------------- o salão: as partes ---------------- */
  const ABAS = [['hier', 'Hierarquia', ['cargos']], ['tropas', 'Tropas', []], ['cons', 'Construções', ['construcoes']], ['sede', 'Sede', []], ['rec', 'Cofre', ['recursos']], ['resp', 'Respeito e relações', ['respeito', 'relacoes']], ['hist', 'Histórico', ['hist']]];
  // (lote 30) a Sede: à vista quando o clã tem sede e os jogadores a veem (quem joga só recebe a que pode ver)
  function sedeVisivel(c) {
    if (!SedeUI || !c || !c.id || !SedeUI.temSede(c.id)) return false;
    if (!mestre) return true;
    const sd = doc(PRE_SEDE + c.id), x = clasMestre().find(y => y.id === c.id);
    return !!(x && x.c.jogadores) || !!(sd && sd.mostrar === true);
  }
  // (lote 42) as Tropas: só quando alguma tropa do clã chega a quem vê
  const abaVisivel = (c, a) => (a === 'sede' ? sedeVisivel(c) : a === 'tropas' ? !!c && !!c.id && tropasDoCla(c.id).length > 0 : ABAS.find(x => x[0] === a)[2].some(k => c.ver[k]));
  function escondida(c) { return h('div', { class: 'aviso', 'data-k': 'escondida', text: 'O mestre ainda não mostrou esta parte de ' + c.nome + '.' }); }
  function linhaHist(e, i, txt) { return h('div', { class: 'linha-h', 'data-h': String(i) }, h('time', { text: dia(e.em) }), h('span', { text: txt })); }

  // a árvore de cargos: o líder no alto; logo abaixo, os cargos lado a lado; mais abaixo, em coluna
  function hierarquia(c, pode) {
    const cs = N.normCargos(c.cargos), resp = !!c.jogadores, fs = N.filhos(cs, 'lider');
    return h('div', { class: 'arvore', 'data-k': 'arvore' },
      cartaoCargo(c, cs, 'lider', pode, resp, 0),
      fs.length ? [h('div', { class: 'liga-v' }), fs.length > 1 ? h('div', { class: 'liga-h' }) : null,
        h('div', { class: 'ramos' }, fs.map(f => ramo(c, cs, f, pode, resp, 1)))] : null);
  }
  function ramo(c, cs, id, pode, resp, prof) {
    const fs = N.filhos(cs, id);
    return h('div', { class: 'ramo', 'data-k': 'ramo:' + id }, h('div', { class: 'liga-v' }), cartaoCargo(c, cs, id, pode, resp, prof),
      fs.length ? h('div', { class: 'sub-ramos' }, fs.map(f => ramo(c, cs, f, pode, resp, prof + 1))) : null);
  }
  function cartaoCargo(c, cs, id, pode, resp, prof) {
    const x = cs[id], ehLider = id === 'lider', podeEste = pode && (!ehLider || mestre), livre = pode && !ocupado;
    const a = { class: 'cargo' + (ehLider ? ' lider' : prof > 1 ? ' sub' : ''), 'data-cargo': id, 'data-k': 'cg:' + id };
    if (livre && !ehLider) {
      a.draggable = 'true';
      a.ondragstart = function (ev) { arrasto = id; try { ev.dataTransfer.setData('text/plain', id); ev.dataTransfer.effectAllowed = 'move'; } catch (e) { /* sem dados */ } this.classList.add('arrastando'); };
      a.ondragend = function () { arrasto = null; this.classList.remove('arrastando'); limparAlvos(); };
    }
    if (livre) {
      a.ondragover = function (ev) { const z = zona(ev, this, id); if (!arrasto || !destino(cs, arrasto, id, z)) return; ev.preventDefault(); marcarAlvo(this, z); };
      a.ondragleave = function () { this.classList.remove('antes', 'depois', 'dentro'); };
      a.ondrop = function (ev) { ev.preventDefault(); const z = zona(ev, this, id), de = arrasto; limparAlvos(); arrasto = null; if (de) soltar(c, cs, de, id, z); };
    }
    const lim = ehLider ? 1 : N.MAX.gente;
    return h('div', a,
      h('div', { class: 'cab' },
        livre && !ehLider ? h('span', { class: 'alca', title: 'Arrastar para mover', 'aria-hidden': 'true' }, '⋮⋮') : null,
        h('b', { text: x.nome }),
        ehLider && pode && !mestre ? h('small', { class: 'nota', text: 'só o mestre muda' }) : null,
        podeEste ? h('button', { type: 'button', class: 'ib leve', 'data-k': 'ren:' + id, title: 'Renomear', 'aria-label': 'Renomear o cargo ' + x.nome, disabled: ocupado, onclick: () => renomearCargoDlg(c, id) }, '✎') : null,
        pode && !ehLider ? h('button', { type: 'button', class: 'ib leve', 'data-k': 'apg:' + id, title: 'Apagar o cargo', 'aria-label': 'Apagar o cargo ' + x.nome, disabled: ocupado, onclick: () => apagarCargoDlg(c, id) }, '×') : null),
      x.gente.length ? x.gente.map(p => linhaPessoa(c, id, p, podeEste && !ehLider, resp)) : h('small', { class: 'ajuda', text: ehLider ? 'Ninguém na liderança ainda.' : 'Ninguém neste cargo ainda.' }),
      pode ? h('div', { class: 'acoes' },
        !ehLider ? h('button', { type: 'button', class: 'btn tracejado', 'data-k': 'pes:' + id, disabled: ocupado || x.gente.length >= lim, onclick: () => pessoaDlg(c, id) }, '+ pessoa') : null,
        h('button', { type: 'button', class: 'btn tracejado', 'data-k': 'sub:' + id, disabled: ocupado || N.totalCargos(cs) >= N.MAX.cargos, onclick: () => novoCargoDlg(c, id) }, ehLider ? '+ cargo' : '+ cargo abaixo'),
        !ehLider ? h('button', { type: 'button', class: 'btn tracejado', 'data-k': 'mov:' + id, disabled: ocupado, onclick: () => moverDlg(c, id) }, 'Mover…') : null,
        ehLider && mestre ? h('button', { type: 'button', class: 'btn tracejado', 'data-k': 'liderar', onclick: () => liderancaDlg(c.id) }, c.jogadores ? 'Passar a liderança…' : 'Trocar o líder…') : null) : null);
  }
  function linhaPessoa(c, cargo, p, pode, resp) {
    const q = quemE(p);
    return h('div', { class: 'pessoa', 'data-pessoa': p.id },
      h('span', { class: 'av' + (q.pj ? ' pj' : '') }, q.img ? h('img', { src: q.img, alt: '' }) : iniciais(q.nome)),
      h('span', { class: 'nm' }, q.nome, q.de ? h('small', { text: ' · ' + q.de }) : null),
      resp && p.resp != null ? h('span', { class: 'resp ' + tom(p.resp), title: N.nomeNivel(nomes(), 'membro', p.resp) + ' (o respeito dentro do clã)' }, N.sinal(p.resp)) : null,
      pode ? h('button', { type: 'button', class: 'ib leve', 'data-k': 'tirar:' + p.id, title: 'Tirar do cargo', 'aria-label': 'Tirar ' + q.nome + ' do cargo', disabled: ocupado, onclick: () => tirarPessoaDo(c, cargo, p) }, '×') : null);
  }
  // arrastar um cargo: no quarto da esquerda de outro, vai antes dele; no da direita, depois; no meio, para debaixo dele
  function zona(ev, el, id) { if (id === 'lider') return 'dentro'; const r = el.getBoundingClientRect(), x = (ev.clientX - r.left) / Math.max(1, r.width); return x < 0.25 ? 'antes' : x > 0.75 ? 'depois' : 'dentro'; }
  function destino(cs, de, alvo, z) {
    if (!cs[de] || !cs[alvo] || de === alvo || de === 'lider') return null;
    const abaixo = N.descendentes(cs, de);
    if (abaixo.has(alvo)) return null;
    if (z === 'dentro') return { pai: alvo, pos: null };
    const pai = cs[alvo].pai, irmaos = N.filhos(cs, pai).filter(k => k !== de), i = irmaos.indexOf(alvo);
    return pai ? { pai, pos: z === 'antes' ? i : i + 1 } : null;
  }
  function marcarAlvo(el, z) { el.classList.remove('antes', 'depois', 'dentro'); el.classList.add(z); }
  function limparAlvos() { for (const el of document.querySelectorAll('.cargo.antes, .cargo.depois, .cargo.dentro, .cargo.arrastando')) el.classList.remove('antes', 'depois', 'dentro', 'arrastando'); }
  function soltar(c, cs, de, alvo, z) {
    const d = destino(cs, de, alvo, z);
    if (!d) return;
    const nome = cs[de].nome, paiNome = d.pai === 'lider' ? 'o líder' : cs[d.pai].nome, mudaPai = cs[de].pai !== d.pai;
    mudarCargos(c, 'mover o cargo ' + nome, mudaPai ? 'pôs o cargo ' + nome + ' abaixo de ' + paiNome : 'mudou a ordem dos cargos', x => N.moverCargo(x, de, d.pai, d.pos));
  }

  function construcoesVer(c) {
    if (!c.construcoes.length) return h('p', { class: 'vazio-p', 'data-k': 'sem-cons', text: 'Nenhuma construção ainda.' });
    return h('div', { class: 'grade', 'data-k': 'cons' }, c.construcoes.map(k => {
      const ic = N.ICONES.find(i => i.id === k.ico) || N.ICONES[0];
      return h('div', { class: 'cons', 'data-cons': k.id },
        h('div', { class: 'cab' }, h('span', { class: 'ico' }, icone(ic.d, 24)), h('b', { text: k.nome }), h('span', { class: 'badge ouro', text: 'Nível ' + k.nivel })),
        h('span', { class: 'ef', text: k.efeito || (k.nivel ? '' : 'Ainda não construída.') }),
        k.prox.custo.length ? h('small', { class: 'ajuda', text: 'Para o nível ' + (k.nivel + 1) + ': ' + N.custoTxt(k.prox.custo, c.recursos) }) : null);
    }));
  }
  function recursosVer(c) {
    const r = c.recursos;
    return h('div', { class: 'lado-a-lado', 'data-k': 'rec' },
      h('div', { class: 'linhas' }, r.lista.length ? r.lista.map(x => h('div', { class: 'rec', 'data-rec': x.id }, h('b', { text: x.nome }), h('span', { class: 'qtd', text: N.qtdTxt(x.qtd) })))
        : h('p', { class: 'vazio-p', text: 'Nenhum recurso ainda.' })),
      h('div', { class: 'cartao' }, h('div', { class: 'cab' }, h('h2', { class: 'tit', text: 'O que mudou' })),
        r.hist.length ? h('div', { class: 'linhas' }, r.hist.slice(0, 30).map((e, i) => linhaHist(e, i, N.mudTxt(e.mud) + (e.mot ? ' · ' + e.mot : ''))))
          : h('p', { class: 'vazio-p', text: 'Nada ainda.' })));
  }
  function escalaEl(v, clicar, chave) {
    const nm = nomes();
    // (lote 8: de −10 a +10; o número aparece no 0, no ±5, no ±10 e no nível de agora — os outros, no toque e na dica)
    return h('div', { class: 'escala', 'data-k': chave }, N.NIVEIS.map(n => {
      const cheio = n === v, marca = cheio || n % 5 === 0, cls = (cheio ? 'cheio ' + (n > 0 ? 'p' : n < 0 ? 'n' : 'z') : '') + (n === 0 ? ' zero-m' : '') + (marca ? '' : ' sem-n');
      const t = N.sinal(n) + ' · ' + nm.mundo[n + N.NIVEL_MAX];
      return clicar ? h('button', { type: 'button', class: cls, 'data-n': String(n), title: t, 'aria-label': t, 'aria-pressed': String(cheio), onclick: () => clicar(n) }, marca ? N.sinal(n) : '')
        : h('div', { class: cls, title: t }, marca ? N.sinal(n) : '');
    }));
  }
  function respeitoVer(c) {
    const nm = nomes(), cor = r => (r.tipo === 'cla' ? (clasDosJogadores().find(x => x.id === r.alvo) || {}).c : null);
    return h('div', { class: 'lado-a-lado', 'data-k': 'resp' },
      c.ver.respeito ? h('div', { class: 'cartao' }, h('div', { class: 'cab' }, h('h2', { class: 'tit', text: 'Respeito no mundo' })),
        escalaEl(c.respeito.v, null, 'esc'),
        h('span', null, h('b', { class: tom(c.respeito.v), text: N.nivelTxt(nm, 'mundo', c.respeito.v) })),
        c.respeito.hist.length ? h('div', { class: 'linhas' }, c.respeito.hist.slice(0, 8).map((e, i) => linhaHist(e, i, N.sinal(e.para) + (e.mot ? ' · ' + e.mot : '')))) : null)
        : h('div', { class: 'cartao' }, h('div', { class: 'cab' }, h('h2', { class: 'tit', text: 'Respeito no mundo' })), escondida(c)),
      c.ver.relacoes ? h('div', { class: 'cartao' }, h('div', { class: 'cab' }, h('h2', { class: 'tit', text: 'Relações' })),
        c.relacoes.length ? c.relacoes.map(r => { const k = cor(r); return h('div', { class: 'rel', 'data-rel': r.id },
          h('span', { class: 'pt', style: r.cor ? 'background:' + r.cor : k ? 'background:' + k.brasao.cores[0] : null }),
          h('span', { class: 'nm' }, r.nome || (k && k.nome) || '?', h('small', { text: ' ' + (r.tipo === 'cla' ? 'clã' : 'facção') })),
          h('span', { class: 'v ' + tom(r.v), text: N.nivelTxt(nm, 'rel', r.v) })); })
          : h('p', { class: 'vazio-p', text: 'Nenhuma relação ainda.' }))
        : h('div', { class: 'cartao' }, h('div', { class: 'cab' }, h('h2', { class: 'tit', text: 'Relações' })), escondida(c)));
  }
  function historicoVer(c) {
    const nm = nomes();
    return h('div', { class: 'cartao', 'data-k': 'hist' },
      c.hist.length ? h('div', { class: 'linhas' }, c.hist.slice(0, 100).map((e, i) => linhaHist(e, i, N.histTxt(e, nm)))) : h('p', { class: 'vazio-p', text: 'Nada ainda.' }),
      h('p', { class: 'ajuda', text: 'As mudanças no clã ficam aqui (sem aviso na mesa ao vivo).' }));
  }
  let chaveSalao = '';
  function pintarSalao(c, pode, oculto) {
    const chave = j([c.brasao]);
    if (chave !== chaveSalao) { chaveSalao = chave; $('fundo').innerHTML = salaoSvg(c.brasao); }       // (desenho fixo, deste site)
    const nm = nomes();
    morphEm($('chips'), [
      c.ver.respeito && c.respeito ? h('span', { class: 'chip', 'data-k': 'ch:resp' }, 'Respeito no mundo: ', h('b', { class: tom(c.respeito.v), text: N.nivelTxt(nm, 'mundo', c.respeito.v) })) : null,
      c.faccao ? h('span', { class: 'chip', 'data-k': 'ch:fac' }, h('span', { class: 'pt', style: 'background:' + (c.faccao.cor || '#8a93a8') }), 'Da facção ' + c.faccao.nome) : null,
      oculto ? h('span', { class: 'chip', 'data-k': 'ch:oc' }, icone(ICO.tranca, 14, '2'), 'Os jogadores não veem este clã') : null,
    ]);
    morphEm($('nomeCla'), [h('h1', { text: c.nome }), c.lema ? h('p', { text: c.lema }) : null]);
    $('abas').hidden = !!oculto;
    if (!oculto && !abaVisivel(c, aba) && ABAS.every(([id]) => !abaVisivel(c, id))) aba = 'hier';
    morphEm($('abas'), oculto ? [] : ABAS.filter(([id]) => (id !== 'sede' && id !== 'tropas') || abaVisivel(c, id)).map(([id, nome]) => {
      const ve = abaVisivel(c, id);
      return h('button', { type: 'button', role: 'tab', class: ve ? null : 'tranca', 'data-aba': id, 'aria-selected': String(aba === id), 'aria-label': ve ? nome : nome + ' (o mestre ainda não mostrou)', onclick: () => { aba = id; pintar(); } },
        nome, ve ? null : icone(ICO.tranca, 13, '2'));
    }));
    let corpo;
    if (oculto) corpo = [h('div', { class: 'aviso', 'data-k': 'oculto' }, 'Os jogadores não veem este clã. ', c.jogadores ? null : 'Para mostrar, use “O que os jogadores veem…” no painel (ou marque “Clã dos jogadores”).')];
    else if (!abaVisivel(c, aba)) corpo = [escondida(c)];
    else if (aba === 'hier') {
      const lider = pode && !mestre, l = c.cargos.lider.gente[0], q = l ? quemE(l) : null;
      corpo = [lider ? h('div', { class: 'aviso lider', 'data-k': 'sou-lider' }, icone(ICO.coroa, 18, '1.8'),
        h('span', { text: 'Você é ' + (q ? 'quem lidera (' + q.nome + ')' : 'quem lidera') + ': crie, renomeie, mova e preencha os cargos abaixo do seu. Passar a liderança é com o mestre.' }),
        h('button', { type: 'button', class: 'btn pri sm', 'data-k': 'novo-cargo', disabled: ocupado, onclick: () => novoCargoDlg(c, 'lider') }, '+ Cargo')) : null,
      hierarquia(c, pode),
      h('p', { class: 'ajuda', text: 'Cada pessoa pode ser um personagem da mesa ou só um nome.' + (c.jogadores ? ' O número ao lado é o respeito dela dentro do clã (de −10 a +10): todos do clã veem; quem muda é o mestre.' : '') })];
    } else if (aba === 'tropas') corpo = [tropasVer(c)];
    else if (aba === 'cons') corpo = [construcoesVer(c)];
    else if (aba === 'sede') corpo = [SedeUI.parteDoSalao(c.id, c.nome)];
    else if (aba === 'rec') corpo = [recursosVer(c)];
    else if (aba === 'resp') corpo = [respeitoVer(c)];
    else corpo = [historicoVer(c)];
    morphEm($('parte'), corpo);
  }

  /* ---------------- o painel de quem mestra ---------------- */
  function resumoVer(c) {
    if (c.jogadores) return { cls: 'jog', txt: 'Clã dos jogadores · eles veem tudo' };
    if (!c.ver.mostrar) return { cls: 'oc', txt: 'NPC · escondido dos jogadores' };
    const partes = N.PARTES.filter(([k]) => c.ver[k]).map(([k]) => ({ cargos: 'cargos', construcoes: 'construções', recursos: 'recursos', respeito: 'respeito', relacoes: 'relações', hist: 'histórico' })[k]);
    return { cls: '', txt: partes.length ? 'NPC · os jogadores veem: ' + partes.join(', ') : 'NPC · os jogadores veem só o nome e o brasão' };
  }
  function telaMestre() {
    const clas = clasMestre();
    if (sel && !clas.some(x => x.id === sel)) sel = null;
    if (!sel && clas.length) sel = clas[0].id;
    const x = clas.find(y => y.id === sel);
    return [
      h('aside', { class: 'lista-clas', 'aria-label': 'Os clãs' },
        h('div', { class: 'row' }, h('h2', { class: 'tit', style: 'flex:1', text: 'Clãs' }),
          h('button', { type: 'button', class: 'btn pri sm', 'data-k': 'novo-cla', disabled: clas.length >= N.MAX.clas, onclick: novoClaDlg }, '+ Clã')),
        clas.map(y => { const r = resumoVer(y.c); return h('button', { type: 'button', class: 'cla-item', 'data-cla': y.id, 'aria-pressed': String(y.id === sel), onclick: () => escolher(y.id) },
          brasaoEl(y.c.brasao, 'l' + y.id, 'mini'), h('span', { class: 'tx' }, h('b', { text: y.c.nome }), h('small', { class: r.cls || null, text: r.txt }))); }),
        h('p', { class: 'ajuda', text: 'Os clãs valem para a mesa toda (todas as campanhas). Num clã de NPC, você escolhe o que os jogadores veem, parte por parte.' })),
      x ? editorCla(x) : h('section', { class: 'ed' }, h('div', { class: 'vazio' }, h('p', { text: 'Nenhum clã ainda.' }),
        h('p', { class: 'ajuda', text: 'Crie o clã dos jogadores e os clãs de NPC (rivais, aliados). Os jogadores só veem o que você mostrar.' }),
        h('button', { type: 'button', class: 'btn pri', 'data-k': 'novo-cla-2', onclick: novoClaDlg }, '+ Clã'))),
    ];
  }
  function campoTexto(k, rotulo, valor, gravar, o = {}) {
    const el = h(o.area ? 'textarea' : 'input', { class: 'in' + (o.cls ? ' ' + o.cls : ''), type: o.area ? null : 'text', 'data-k': k, value: valor || '', maxlength: o.max || 200, placeholder: o.ph || null,
      rows: o.area ? o.linhas || 3 : null, autocomplete: 'off', 'aria-label': rotulo, onchange: function () { gravar(this.value, this); } });
    return o.semRotulo ? el : h('label', { class: 'field' }, h('span', { text: rotulo }), el);
  }
  function motivoEl(parte, ph) {
    return h('input', { class: 'in', type: 'text', 'data-k': 'mot:' + parte, maxlength: N.MAX.motivo, value: motivos[parte], placeholder: ph, 'aria-label': 'Motivo da próxima mudança (vai para o histórico)',
      oninput: function () { motivos[parte] = this.value; } });
  }
  // o motivo vale para uma linha do histórico: usado, o campo esvazia (as mudanças seguidas na mesma coisa continuam na mesma linha)
  const usarMotivo = parte => { const m = motivos[parte]; motivos[parte] = ''; return m; };
  function editorCla(x) {
    const c = x.c, id = x.id, V = N.comoVista(c, id);
    return h('section', { class: 'ed', 'aria-label': 'O clã ' + c.nome, 'data-k': 'ed:' + id },
      cabecalho(x),
      h('div', { class: 'cartao', 'data-k': 'sec:hier' }, h('div', { class: 'cab' }, h('h2', { class: 'tit', text: 'Hierarquia' }),
        h('small', { class: 'ajuda', text: c.jogadores ? 'O líder (o dono do personagem no cargo de líder) também mexe nos cargos abaixo do dele.' : 'Os jogadores veem os cargos se você marcar “Cargos e quem ocupa”.' })),
        hierarquia(V, true)),
      secTropas(x),
      h('div', { class: 'lado-a-lado' }, secConstrucoes(x), secRecursos(x)),
      SedeUI ? SedeUI.cartao(x) : null,
      h('div', { class: 'lado-a-lado' }, secRespeito(x), secRelacoes(x), secMembros(x)),
      secHistorico(x));
  }
  function cabecalho(x) {
    const c = x.c, id = x.id, facs = faccoesDoMundo();
    const opcFac = facs.map(f => h('option', { value: f.id, text: f.nome + (f.oculta ? ' (escondida no mapa)' : '') + (f.mapa && facs.filter(y => y.nome === f.nome).length > 1 ? ' · ' + f.mapa : '') }));
    if (c.faccao && !facs.some(f => f.id === c.faccao.id)) opcFac.push(h('option', { value: c.faccao.id, text: c.faccao.nome + ' (não está mais num mapa)' }));
    return h('div', { class: 'cab-cla', 'data-k': 'cab' },
      h('button', { type: 'button', class: 'grande', 'data-k': 'brasao-g', title: 'O brasão', 'aria-label': 'Editar o brasão', onclick: () => brasaoDlg(id) }, brasaoEl(c.brasao, 'g' + id)),
      h('div', { class: 'nomes' },
        campoTexto('c:nome', 'Nome do clã', c.nome, (v, el) => { if (!v.replace(/\s+/g, ' ').trim()) { el.value = c.nome; toast('O clã precisa de um nome.'); return; } mudarCla(id, 'mudar o nome do clã', y => { y.nome = v.replace(/\s+/g, ' ').trim(); }); }, { max: N.MAX.nome, semRotulo: true, cls: 'nome' }),
        campoTexto('c:lema', 'Lema', c.lema, v => mudarCla(id, 'mudar o lema', y => { y.lema = v; }), { max: N.MAX.lema, semRotulo: true, ph: 'O lema (ex.: “Onde a luz termina, nós ficamos.”)' })),
      h('div', { class: 'opcoes' },
        h('label', { class: 'row', style: 'font-size:13px;color:var(--fg-2)', title: 'O brasão do clã vira a bandeira desta facção no Mapa-múndi (lote 8)' }, 'Facção (do Mapa-múndi)',
          h('select', { class: 'in', 'data-k': 'c:fac', value: c.faccao ? c.faccao.id : '', disabled: !opcFac.length,
            onchange: function () { const v = this.value, f = facs.find(y => y.id === v); mudarCla(id, 'mudar a facção do clã', y => { y.faccao = v ? (f ? { id: f.id, nome: f.nome, cor: f.cor } : y.faccao) : null; }); } },
            h('option', { value: '', text: opcFac.length ? 'Nenhuma' : 'Nenhuma facção nos mapas ainda' }), opcFac)),
        h('label', { class: 'chk' }, h('input', { type: 'checkbox', 'data-k': 'c:jog', checked: c.jogadores,
          onchange: function () { const sim = this.checked; if (mudarCla(id, sim ? 'marcar como o clã dos jogadores' : 'desmarcar o clã dos jogadores', y => { y.jogadores = sim; })) { const sd = doc(PRE_SEDE + id); if (sd && naMesa) gravarDoc(PRE_SEDE + id, sd); avisoDesfazer(sim ? 'Agora os jogadores veem tudo de ' + c.nome + '.' : c.nome + ' virou um clã de NPC: os jogadores veem só o que você marcar.'); } } }),
          'Clã dos jogadores (eles veem tudo; o líder mexe nos cargos)'),
        h('div', { class: 'row' },
          h('button', { type: 'button', class: 'btn sm', 'data-k': 'c:brasao', onclick: () => brasaoDlg(id) }, 'Brasão…'),
          c.jogadores ? null : h('button', { type: 'button', class: 'btn sm', 'data-k': 'c:ver', onclick: () => verDlg(id) }, 'O que os jogadores veem…'),
          h('button', { type: 'button', class: 'btn sm', 'data-k': 'c:lider', onclick: () => liderancaDlg(id) }, c.jogadores ? 'Passar a liderança…' : 'Trocar o líder…'),
          h('button', { type: 'button', class: 'btn sm per', 'data-k': 'c:apagar', onclick: () => apagarClaDlg(id) }, 'Apagar o clã'))));
  }
  function secConstrucoes(x) {
    const c = x.c, id = x.id;
    return h('div', { class: 'cartao', 'data-k': 'sec:cons', style: 'flex:2 1 520px' },
      h('div', { class: 'cab' }, h('h2', { class: 'tit', text: 'Construções do clã' }), h('button', { type: 'button', class: 'btn sm', 'data-k': 'cons:nova', disabled: c.construcoes.length >= N.MAX.construcoes, onclick: () => construcaoDlg(id, null) }, '+ Construção')),
      c.construcoes.length ? h('div', { class: 'grade' }, c.construcoes.map(k => {
        const ic = N.ICONES.find(i => i.id === k.ico) || N.ICONES[0], f = N.falta(c, k.id), custo = k.prox.custo;
        const gasto = custo.map(y => '−' + N.qtdTxt(y.qtd) + ' ' + ((c.recursos.lista.find(r => r.id === y.rec) || {}).nome || y.nome)).join(', ');
        return h('div', { class: 'cons', 'data-cons': k.id },
          h('div', { class: 'cab' }, h('span', { class: 'ico' }, icone(ic.d, 22)), h('b', { text: k.nome }), h('span', { class: 'badge ouro', text: 'Nível ' + k.nivel }),
            h('button', { type: 'button', class: 'ib leve', 'data-k': 'cons:ed:' + k.id, title: 'Editar', 'aria-label': 'Editar ' + k.nome, onclick: () => construcaoDlg(id, k.id) }, '✎')),
          h('span', { class: 'ef', text: k.efeito || (k.nivel ? 'Sem efeito escrito.' : 'Ainda não construída.') }),
          h('div', { class: 'prox' }, h('small', { text: 'Para o nível ' + (k.nivel + 1) }),
            h('span', null, custo.length ? N.custoTxt(custo, c.recursos) : 'sem custo', f.length ? h('span', { class: 'falta', text: ' (faltam ' + f.map(y => N.qtdTxt(y.qtd) + ' ' + y.nome).join(', ') + ')' }) : null,
              k.prox.efeito ? ' · o efeito novo: “' + k.prox.efeito + '”' : null)),
          h('button', { type: 'button', class: 'btn' + (f.length ? '' : ' pri'), 'data-k': 'cons:sobe:' + k.id, disabled: !!f.length || k.nivel >= N.MAX.nivel,
            title: f.length ? 'Faltam recursos: ajuste o cofre do clã antes' : null, onclick: () => subir(id, k) }, 'Subir de nível' + (gasto && !f.length ? ' (' + gasto + ')' : '')));
      })) : h('p', { class: 'vazio-p', text: 'Nenhuma construção ainda.' }),
      h('p', { class: 'ajuda', text: '“Subir de nível” desconta o custo do cofre do clã (com Desfazer) e fica no histórico. Cada construção: nome, ícone, nível, efeito escrito e o custo do próximo nível. (As construções das cidades, no Mapa-múndi, são outra coisa: as do catálogo do mundo.)' }));
  }
  function subir(id, k) {
    let feito = false;
    mudarCla(id, 'subir ' + k.nome + ' de nível', y => { const r = N.subirNivel(y, k.id, agora()); if (!r.ok) { toast(r.falta.length ? 'Faltam recursos para subir ' + k.nome + '.' : 'Não deu para subir de nível.'); return false; } feito = trocar(y, r.cla); });
    if (!feito) return;
    // (lote 30) o prédio dela na Sede: a planta do nível novo fica sugerida lá (o mestre confirma)
    const sd = window.TC && TC.sede ? TC.sede.normSede(doc(PRE_SEDE + id)) : null, pr = sd ? sd.predios.find(p => p.cons === k.id) : null;
    const nv = Math.max(1, Math.min(3, k.nivel + 1)), sug = pr && pr.nivel !== nv && S_PREDIO(pr) ? ' Na Sede, ' + pr.nome + ' pode passar para a planta do nível ' + nv + '.' : '';
    avisoDesfazer(k.nome + (k.nivel === 0 ? ' foi construída.' : ' subiu para o nível ' + (k.nivel + 1) + '.') + sug);
  }
  const S_PREDIO = pr => !!(window.TC && TC.sede && TC.sede.PREDIOS[pr.tipo]);
  /* (lote 10, pente fino) O estoque da facção ligada ao clã, no Mapa-múndi (com a economia ligada), só para ler: o cofre
     do clã é outra coisa. → { fac, mapa, linhas: [{ nome, n }] } ou null */
  function estoqueDaFaccao(c) {
    if (!naMesa || !c.faccao || !c.faccao.id) return null;
    for (const l of D.todas()) {
      if (typeof l.id !== 'string' || !l.id.startsWith('mundo:mapa:') || l.apagado || !ehObj(l.dados) || !Array.isArray(l.dados.faccoes)) continue;
      const f = l.dados.faccoes.find(y => ehObj(y) && y.id === c.faccao.id);
      if (!f) continue;
      const eco = ehObj(l.dados.eco) && l.dados.eco.on === true && Array.isArray(l.dados.eco.rec) ? l.dados.eco : null;
      if (!eco) return null;
      return { fac: String(f.nome || '').trim().slice(0, 60) || 'Facção', mapa: String(l.dados.nome || '').slice(0, 60),
        linhas: eco.rec.filter(ehObj).map(w => { const r = Array.isArray(f.rec) ? f.rec.find(y => ehObj(y) && y.id === w.id) : null; return { nome: String(w.nome || '').slice(0, 40), n: r ? Number(r.n) || 0 : 0 }; }) };
    }
    return null;
  }
  function secRecursos(x) {
    const c = x.c, id = x.id, est = estoqueDaFaccao(c);
    const mudar = (r, d) => mudarCla(id, (d > 0 ? 'somar ' : 'tirar ') + r.nome, y => trocar(y, N.mudarRecurso(y, r.id, d, usarMotivo('rec'), agora())));
    return h('div', { class: 'cartao', 'data-k': 'sec:rec', style: 'flex:1 1 340px' },
      h('div', { class: 'cab' }, h('h2', { class: 'tit', text: 'Cofre do clã' }), h('button', { type: 'button', class: 'btn sm', 'data-k': 'rec:novo', disabled: c.recursos.lista.length >= N.MAX.recursos, onclick: () => recursoDlg(id, null) }, '+ Recurso')),
      c.recursos.lista.length ? c.recursos.lista.map(r => h('div', { class: 'rec', 'data-rec': r.id },
        h('b', { text: r.nome }),
        h('button', { type: 'button', class: 'ib leve', 'data-k': 'rec:ren:' + r.id, title: 'Renomear', 'aria-label': 'Renomear ' + r.nome, onclick: () => recursoDlg(id, r.id) }, '✎'),
        h('button', { type: 'button', class: 'ib', 'data-k': 'rec:menos:' + r.id, title: 'Tirar 1 (com Shift, 10)', 'aria-label': 'Tirar de ' + r.nome, disabled: r.qtd <= 0, onclick: ev => mudar(r, ev.shiftKey ? -10 : -1) }, '−'),
        h('input', { class: 'qtd', type: 'number', min: 0, max: N.MAX.qtd, step: 1, 'data-k': 'rec:qtd:' + r.id, value: String(r.qtd), 'aria-label': 'Quantidade de ' + r.nome,
          onchange: function () { mudarCla(id, 'mudar ' + r.nome, y => trocar(y, N.definirRecurso(y, r.id, this.value, usarMotivo('rec'), agora()))) || pintar(); } }),
        h('button', { type: 'button', class: 'ib', 'data-k': 'rec:mais:' + r.id, title: 'Somar 1 (com Shift, 10)', 'aria-label': 'Somar em ' + r.nome, onclick: ev => mudar(r, ev.shiftKey ? 10 : 1) }, '+')))
        : h('p', { class: 'vazio-p', text: 'Nenhum recurso ainda (ouro, madeira, ferro, influência…).' }),
      h('label', { class: 'field' }, h('span', { text: 'Motivo da próxima mudança (vai para o histórico)' }), motivoEl('rec', 'ex.: o pagamento da escolta')),
      est ? h('div', { class: 'fac-estoque', 'data-k': 'rec:fac' }, h('b', { text: 'Estoque de ' + est.fac + ' (Mapa-múndi)' }),
        h('span', { 'data-k': 'rec:fac:linhas', text: est.linhas.map(y => y.nome + ' ' + y.n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })).join(' · ') || 'nada' }),
        h('small', { class: 'ajuda', text: 'Só para ler: é o estoque da facção ligada ao clã, que muda no Mapa-múndi (a semana, as obras). O cofre do clã, acima, é outra coisa.' })) : null);
  }
  function secRespeito(x) {
    const c = x.c, id = x.id, nm = nomes();
    const ir = n => mudarCla(id, 'mudar o respeito no mundo', y => trocar(y, N.mudarRespeito(y, n, usarMotivo('resp'), agora())));
    return h('div', { class: 'cartao', 'data-k': 'sec:resp' },
      h('div', { class: 'cab' }, h('h2', { class: 'tit', text: 'Respeito no mundo' }), h('button', { type: 'button', class: 'link', 'data-k': 'niveis', onclick: niveisDlg }, 'Renomear os níveis')),
      h('div', { class: 'row', style: 'flex-wrap:nowrap' },
        h('button', { type: 'button', class: 'ib', 'data-k': 'resp:menos', 'aria-label': 'Menos respeito', disabled: c.respeito.v <= -N.NIVEL_MAX, onclick: () => ir(c.respeito.v - 1) }, '−'),
        escalaEl(c.respeito.v, ir, 'esc-m'),
        h('button', { type: 'button', class: 'ib', 'data-k': 'resp:mais', 'aria-label': 'Mais respeito', disabled: c.respeito.v >= N.NIVEL_MAX, onclick: () => ir(c.respeito.v + 1) }, '+')),
      h('span', null, h('b', { class: tom(c.respeito.v), 'data-k': 'resp:txt', text: N.nivelTxt(nm, 'mundo', c.respeito.v) })),
      motivoEl('resp', 'Motivo (opcional): ex.: a escolta chegou inteira'),
      c.respeito.hist.length ? h('div', { class: 'linhas' }, c.respeito.hist.slice(0, 6).map((e, i) => h('div', { class: 'linha-h', 'data-h': String(i) }, h('time', { text: dia(e.em) }),
        h('span', null, N.sinal(e.para) + (e.mot ? ' · ' + e.mot : '') + ' ', h('button', { type: 'button', class: 'link', 'data-k': 'corrigir:' + i, onclick: () => corrigirDlg(id, i) }, 'corrigir'))))) : null);
  }
  function nomeDaRelacao(r, clas) { if (r.tipo === 'cla') { const k = clas.find(y => y.id === r.alvo); return k ? k.c.nome : 'Um clã apagado'; } return r.nome || 'Facção'; }
  function secRelacoes(x) {
    const c = x.c, id = x.id, nm = nomes(), clas = clasMestre();
    const ir = (r, n) => mudarCla(id, 'mudar a relação com ' + nomeDaRelacao(r, clas), y => trocar(y, N.mudarRelacao(y, r.id, n, usarMotivo('rel'), agora(), nomeDaRelacao(r, clas))));
    return h('div', { class: 'cartao', 'data-k': 'sec:rel' },
      h('div', { class: 'cab' }, h('h2', { class: 'tit', text: 'Relações' }), h('button', { type: 'button', class: 'btn sm', 'data-k': 'rel:nova', disabled: c.relacoes.length >= N.MAX.relacoes, onclick: () => relacaoDlg(id) }, '+ Facção ou clã')),
      c.relacoes.length ? c.relacoes.map(r => {
        const k = r.tipo === 'cla' ? clas.find(y => y.id === r.alvo) : null, cor = k ? k.c.brasao.cores[0] : r.cor;
        return h('div', { class: 'rel', 'data-rel': r.id },
          h('span', { class: 'pt', style: cor ? 'background:' + cor : null }), h('span', { class: 'nm' }, nomeDaRelacao(r, clas), h('small', { text: ' ' + (r.tipo === 'cla' ? 'clã' + (k && !N.visivel(Object.assign({ id: k.id }, k.c)) ? ' (escondido)' : '') : 'facção'),
            title: k && !N.visivel(Object.assign({ id: k.id }, k.c)) ? 'Os jogadores não veem este clã: a relação com ele não chega a eles.' : null })),
          h('button', { type: 'button', class: 'ib', 'data-k': 'rel:menos:' + r.id, 'aria-label': 'Piorar a relação', disabled: r.v <= -N.NIVEL_MAX, onclick: () => ir(r, r.v - 1) }, '−'),
          h('span', { class: 'v ' + tom(r.v), text: N.nivelTxt(nm, 'rel', r.v) }),
          h('button', { type: 'button', class: 'ib', 'data-k': 'rel:mais:' + r.id, 'aria-label': 'Melhorar a relação', disabled: r.v >= N.NIVEL_MAX, onclick: () => ir(r, r.v + 1) }, '+'),
          h('button', { type: 'button', class: 'ib leve', 'data-k': 'rel:x:' + r.id, title: 'Tirar a relação', 'aria-label': 'Tirar a relação com ' + nomeDaRelacao(r, clas),
            onclick: () => { if (mudarCla(id, 'tirar a relação com ' + nomeDaRelacao(r, clas), y => { y.relacoes = y.relacoes.filter(z => z.id !== r.id); })) avisoDesfazer('A relação com ' + nomeDaRelacao(r, clas) + ' saiu.'); } }, '×'));
      }) : h('p', { class: 'vazio-p', text: 'Nenhuma relação ainda.' }),
      motivoEl('rel', 'Motivo (opcional)'),
      h('p', { class: 'ajuda', text: 'De −' + N.NIVEL_MAX + ' (' + nm.rel[0] + ') a +' + N.NIVEL_MAX + ' (' + nm.rel[2 * N.NIVEL_MAX] + '). Cada mudança vai para o histórico, com o motivo, se houver.' }));
  }
  function secMembros(x) {
    const c = x.c, id = x.id, nm = nomes(), ms = N.membros(c.cargos);
    const ir = (m, n) => { const q = quemE(m.pessoa); mudarCla(id, 'mudar o respeito de ' + q.nome, y => trocar(y, N.mudarMembro(y, m.pid, n, usarMotivo('membro'), agora(), q.nome))); };
    return h('div', { class: 'cartao', 'data-k': 'sec:membros' },
      h('div', { class: 'cab' }, h('h2', { class: 'tit', text: 'Respeito dos membros' })),
      ms.length ? ms.map(m => { const q = quemE(m.pessoa), v = m.pessoa.resp;
        return h('div', { class: 'membro', 'data-membro': m.pid },
          h('span', { class: 'nm' }, q.nome, h('small', { text: ' ' + m.cargoNome + (m.pessoa.pc && !q.pj ? ' · NPC' : !m.pessoa.pc ? ' · só um nome' : '') })),
          h('button', { type: 'button', class: 'ib', 'data-k': 'mb:menos:' + m.pid, 'aria-label': 'Menos respeito para ' + q.nome, disabled: v <= -N.NIVEL_MAX, onclick: () => ir(m, v - 1) }, '−'),
          h('span', { class: 'v ' + tom(v), text: N.nivelTxt(nm, 'membro', v) }),
          h('button', { type: 'button', class: 'ib', 'data-k': 'mb:mais:' + m.pid, 'aria-label': 'Mais respeito para ' + q.nome, disabled: v >= N.NIVEL_MAX, onclick: () => ir(m, v + 1) }, '+')); })
        : h('p', { class: 'vazio-p', text: 'Ninguém nos cargos ainda.' }),
      ms.length ? motivoEl('membro', 'Motivo (opcional)') : null,
      h('p', { class: 'ajuda', text: c.jogadores ? 'Todos do clã veem; só você muda.' : 'Num clã de NPC, os jogadores não veem o respeito dos membros.' }));
  }
  function secHistorico(x) {
    const c = x.c, nm = nomes(), l = verTudo ? c.hist : c.hist.slice(0, 40);
    return h('div', { class: 'cartao', 'data-k': 'sec:hist' },
      h('div', { class: 'cab' }, h('h2', { class: 'tit', text: 'Histórico' }), h('small', { class: 'ajuda', text: c.hist.length ? String(c.hist.length) + (c.hist.length > 1 ? ' linhas' : ' linha') : '' })),
      l.length ? h('div', { class: 'linhas' }, l.map((e, i) => linhaHist(e, i, N.histTxt(e, nm)))) : h('p', { class: 'vazio-p', text: 'Nada ainda: as mudanças no clã aparecem aqui.' }),
      c.hist.length > 40 ? h('button', { type: 'button', class: 'link', 'data-k': 'hist:tudo', onclick: () => { verTudo = !verTudo; pintar(); } }, verTudo ? 'Mostrar menos' : 'Mostrar tudo') : null);
  }


  /* ---------------- (lote 42) as tropas do clã ----------------
     A tropa do clã é a tropa da ficha de quem a lidera (o documento fichas:tropas:<id do personagem>, com cla = o id do
     clã): cada personagem lidera uma só. Quem mestra cadastra (escolhendo quem lidera; quem já tem tropa entra com ela)
     e tira do clã (a tropa fica na ficha). O líder do clã recebe todas para ver: quem mestra põe o dono do personagem no
     cargo de líder na lista "para" de cada uma (ver supabase/migrations/0030). O líder de cada tropa vê a dele — e
     escolhe nela pelas Fichas. Gravar a tropa é de quem mestra as Fichas (o banco confere). */
  const PRE_TROPA = 'fichas:tropas:';
  const TT = () => (window.TC && window.TC.tropas) || null;
  const gravaFichas = () => naMesa && mestre && !!(window.TC && TC.ponte && (typeof TC.ponte.mestra !== 'function' || TC.ponte.mestra('fichas')));
  const cfgFichas = () => { const l = D && D.pegar('fichas:cfg'); return l && !l.apagado && ehObj(l.dados) && ehObj(l.dados.v) ? l.dados.v : null; };
  function tropasDoCla(claId) {
    const T = TT();
    if (!naMesa || !T || !D) return [];
    const out = [];
    for (const l of D.todas()) {
      const pc = typeof l.id === 'string' ? T.pcDoDoc(l.id) : null;
      if (!pc || l.apagado || !ehObj(l.dados) || l.dados.cla !== claId) continue;
      const p = pcDe(pc);
      out.push({ pc, d: T.norm(l.dados), c: T.calc(l.dados, cfgFichas()), nome: p ? p.nome : 'Um personagem', minha: !!eu && l.dono_id === eu });
    }
    return out.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }
  // o dono do personagem no cargo de líder do clã: quem recebe as tropas do clã, para ver
  function donoDoLider(claId) { const x = clasMestre().find(y => y.id === claId), l = x ? N.lider(x.c.cargos) : null, p = l && l.pc ? pcDe(l.pc) : null; return p && p.dono ? p.dono : null; }
  const paraDe = claId => { const d = claId ? donoDoLider(claId) : null; return d ? [d] : null; };
  // a lista "para" de cada tropa acompanha a liderança do clã (quem mestra as Fichas grava)
  function sincronizarTropas() {
    if (!gravaFichas() || !TT()) return;
    for (const l of D.todas()) {
      if (typeof l.id !== 'string' || !l.id.startsWith(PRE_TROPA) || l.apagado || !ehObj(l.dados)) continue;
      const quer = paraDe(l.dados.cla || null);
      if (j(l.para || null) !== j(quer)) D.gravar(l.id, { para: quer });
    }
  }
  const nomeDoCla = id => { const k = clasMestre().find(y => y.id === id); return k ? k.c.nome : 'outro clã'; };
  function resumoTropa(t) {
    const T = TT(), c = t.c, n = c.tropas;
    return (c.unidades ? n.toLocaleString('pt-BR') + (n === 1 ? ' soldado' : ' soldados') + ' em ' + c.unidades + (c.unidades === 1 ? ' unidade' : ' unidades') : 'sem soldados agora')
      + (c.vetMedia != null ? ' · ' + c.vetNome + ' (' + T.fmtMedia(c.vetMedia) + ')' : '') + (t.d.lig ? ' · no Mapa-múndi' : '');
  }
  function linhaTropa(t, comoMestre) {
    return h('div', { class: 'tropa-cla', 'data-tropa': t.pc },
      brasaoEl(t.d.bras, 'tr' + t.pc, 'mini'),
      h('span', { class: 'tx' }, h('b', { text: t.d.nome }), h('small', { text: 'liderada por ' + t.nome + (t.minha ? ' (você)' : '') + ' · ' + resumoTropa(t) })),
      naCasca() && (comoMestre || t.minha) ? h('button', { type: 'button', class: 'btn sm', 'data-k': 'tr:abrir:' + t.pc, onclick: () => TC.ponte.ir('fichas', { pc: t.pc, sub: 'tropas' }) }, 'Abrir na ficha') : null,
      comoMestre ? h('button', { type: 'button', class: 'btn sm per', 'data-k': 'tr:tirar:' + t.pc, disabled: !gravaFichas(), onclick: () => tirarDoCla(t.pc) }, 'Tirar do clã') : null);
  }
  // as unidades de uma tropa, para ver (o líder do clã e o líder da tropa, no salão)
  function unidadesDaTropa(t) {
    const T = TT();
    if (!t.c.cartas.length) return h('p', { class: 'vazio-p', text: 'Sem unidades.' });
    return h('div', { class: 'unids-cla' }, t.c.cartas.map(k => h('div', { class: 'unid-cla', 'data-unid': k.u.id },
      brasaoEl(k.u.bras, 'tu' + t.pc + k.u.id, 'mini'),
      h('span', { class: 'tx' }, h('b', { text: k.u.nome }), h('small', { text: [T.racaDe(k.u, null) || '', T.classeDe(k.u, null) || '', k.nomeVet].filter(Boolean).join(' · ') })),
      h('span', { class: 'nums', text: k.u.tropas.toLocaleString('pt-BR') + (k.u.tropas === 1 ? ' soldado' : ' soldados') + ' · ATQ ' + (k.atq >= 0 ? '+' : '−') + Math.abs(k.atq) + ' · DEF ' + (k.def >= 0 ? '+' : '−') + Math.abs(k.def) + (k.u.sold.length ? ' · ' + k.u.sold.length + ' com nome' : '') }))));
  }
  function secTropas(x) {
    if (!naMesa || !TT()) return null;
    const id = x.id, ts = tropasDoCla(id), pode = gravaFichas(), lider = donoDoLider(id);
    return h('div', { class: 'cartao', 'data-k': 'sec:tropas' },
      h('div', { class: 'cab' }, h('h2', { class: 'tit', text: 'Tropas do clã' }), h('small', { class: 'ajuda', text: ts.length ? ts.length + (ts.length === 1 ? ' tropa' : ' tropas') : '' }),
        h('button', { type: 'button', class: 'btn sm', 'data-k': 'tr:nova', disabled: !pode, title: pode ? null : 'Quem mestra as Fichas cadastra as tropas', onclick: () => tropaDlg(id) }, '+ Tropa')),
      ts.length ? h('div', { class: 'tropas-cla' }, ts.map(t => linhaTropa(t, true))) : h('p', { class: 'vazio-p', text: 'Nenhuma tropa ainda. Cadastre escolhendo quem lidera: a tropa mora na ficha dele (aba Tropas, nas Fichas).' }),
      h('p', { class: 'ajuda', text: 'Cada personagem lidera uma tropa só (a da ficha dele). O líder do clã vê todas as tropas do clã, sem mudar os números; o líder de cada tropa escolhe nela, pelas Fichas.' + (lider ? '' : ' Este clã ainda não tem um jogador na liderança: só você vê a lista.') }));
  }
  function tropaDlg(claId) {
    const T = TT(), x = clasMestre().find(y => y.id === claId);
    if (!T || !x || !gravaFichas()) return;
    const estado = p => { const l = D.pegar(PRE_TROPA + p.id), d = l && !l.apagado && ehObj(l.dados) ? l.dados : null; return { d, cla: d && d.cla ? d.cla : null }; };
    const ps = personagens().filter(p => estado(p).cla !== claId);
    if (!ps.length) { toast('Todos os personagens da mesa já lideram uma tropa deste clã.'); return; }
    const sel = h('select', { class: 'in', 'data-k': 'tr:lider', 'aria-label': 'Quem lidera' }, h('option', { value: '', text: 'Escolha quem lidera…' }),
      ps.map(p => { const e = estado(p); return h('option', { value: p.id, text: p.nome + (p.dono ? '' : ' (NPC)') + (e.cla ? ' — lidera uma tropa de ' + nomeDoCla(e.cla) + ' (ela passa para este clã)' : e.d ? ' — já tem uma tropa (ela entra no clã)' : '') }); }));
    const ok = () => { const v = sel.value; if (!v) { toast('Escolha quem lidera a tropa.'); sel.focus(); return; } fechar(); cadastrarTropa(claId, v); };
    abrir('', [h('h2', { text: 'Uma tropa para ' + x.c.nome }),
      h('p', { class: 'ajuda', text: 'A tropa mora na ficha de quem a lidera (aba Tropas, nas Fichas): cada personagem lidera uma só. Quem já tem tropa entra com ela; quem não tem ganha uma, com uma unidade de recrutas.' }),
      h('label', { class: 'field' }, h('span', { text: 'Quem lidera' }), sel), pe(btCancelar(), h('button', { type: 'button', class: 'btn pri', 'data-k': 'dl:sim', onclick: ok }, 'Cadastrar'))]);
    sel.focus();
  }
  function cadastrarTropa(claId, pc) {
    const T = TT(), l = D.pegar(PRE_TROPA + pc), antes = l && !l.apagado && ehObj(l.dados) ? copia(l.dados) : null, p = pcDe(pc);
    const x = antes ? T.norm(antes) : T.nova(p ? p.nome : '', agora(), '');
    const deOutro = antes && antes.cla && antes.cla !== claId;
    x.cla = claId;
    D.gravar(PRE_TROPA + pc, { dados: x, vis: 'mestre', dono_id: l && !l.apagado ? l.dono_id || null : (p && p.dono) || null, para: paraDe(claId) }, null, { cas: true });
    pintar();
    const nome = p ? p.nome : 'o personagem';
    toast(antes ? 'A tropa de ' + nome + (deOutro ? ' passou para este clã.' : ' entrou no clã.') : 'Tropa criada para ' + nome + ', no clã (a aba Tropas apareceu na ficha).', 'Desfazer', () => {
      if (antes) D.gravar(PRE_TROPA + pc, { dados: antes, para: paraDe(antes.cla || null) }, null, { cas: true }); else D.apagar(PRE_TROPA + pc);
      pintar();
    });
  }
  function tirarDoCla(pc) {
    const T = TT(), l = D.pegar(PRE_TROPA + pc);
    if (!T || !l || l.apagado || !ehObj(l.dados) || !gravaFichas()) return;
    const antes = copia(l.dados), x = T.norm(antes), p = pcDe(pc);
    delete x.cla;
    D.gravar(PRE_TROPA + pc, { dados: x, para: null }, null, { cas: true });
    pintar();
    toast('A tropa saiu do clã (continua na ficha de ' + (p ? p.nome : 'quem a lidera') + ').', 'Desfazer', () => { D.gravar(PRE_TROPA + pc, { dados: antes, para: paraDe(antes.cla || null) }, null, { cas: true }); pintar(); });
  }
  // o salão: as tropas do clã que chegam a quem vê (o líder do clã: todas; o líder de uma tropa: a dele)
  function tropasVer(c) {
    const ts = tropasDoCla(c.id), lider = souLider(c);
    return h('div', { class: 'cartao', 'data-k': 'ver:tropas' },
      h('div', { class: 'cab' }, h('h2', { class: 'tit', text: 'Tropas do clã' }), h('small', { class: 'ajuda', text: mestre ? 'Como o líder do clã vê' : lider ? 'Você lidera o clã: vê todas' : 'A sua tropa' })),
      ts.map(t => h('div', { class: 'tropa-ver', 'data-k': 'ver:tropa:' + t.pc }, linhaTropa(t, false), unidadesDaTropa(t))),
      h('p', { class: 'ajuda', text: 'Os números são do mestre. Quem lidera cada tropa escolhe nela (os nomes, os brasões, os equipamentos, os soldados), na aba Tropas das Fichas.' }));
  }

  /* ---------------- janelas ---------------- */
  function abrir(cls, conteudo, onclose) {
    const dlg = $('dlg');
    dlg.className = 'dl' + (cls ? ' ' + cls : '');
    // (o aviso de "fechou" da janela de antes chega depois, já com esta aberta: só vale o fechar desta)
    dlg.onclose = onclose ? () => { if (!dlg.open) onclose(); } : null;
    dlg.replaceChildren(...conteudo);
    if (!dlg.open) dlg.showModal();
    return dlg;
  }
  function fechar() { const dlg = $('dlg'); if (dlg.open) dlg.close(); }
  const pe = (...b) => h('div', { class: 'pe' }, ...b);
  const btCancelar = () => h('button', { type: 'button', class: 'btn', 'data-k': 'dl:nao', onclick: fechar }, 'Cancelar');
  // pedir um nome (um cargo novo, um cargo renomeado)
  function pedirNome(titulo, rotulo, valor, ok, fn) {
    const campo = h('input', { class: 'in', type: 'text', maxlength: N.MAX.nomeCargo, value: valor || '', 'data-k': 'dl:nome', 'aria-label': rotulo });
    const salvar = () => { const n = String(campo.value || '').replace(/\s+/g, ' ').trim(); if (!n) { toast('Escreva um nome.'); campo.focus(); return; } fechar(); fn(n); };
    campo.onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); salvar(); } };
    abrir('', [h('h2', { text: titulo }), h('label', { class: 'field' }, h('span', { text: rotulo }), campo), pe(btCancelar(), h('button', { type: 'button', class: 'btn pri', 'data-k': 'dl:sim', onclick: salvar }, ok))]);
    campo.focus(); campo.select();
  }
  function confirmar(titulo, texto, ok) {
    return new Promise(resolve => {
      let feito = false;
      const fim = v => { if (feito) return; feito = true; $('dlg').onclose = null; fechar(); resolve(v); };
      abrir('', [h('h2', { text: titulo }), h('p', { text: texto }), pe(h('button', { type: 'button', class: 'btn', 'data-k': 'dl:nao', onclick: () => fim(false) }, 'Cancelar'),
        h('button', { type: 'button', class: 'btn pri', 'data-k': 'dl:sim', onclick: () => fim(true) }, ok || 'OK'))], () => fim(false));
      $('dlg').querySelector('[data-k="dl:sim"]').focus();
    });
  }

  // cargos (quem mestra e o líder)
  function novoCargoDlg(c, pai) {
    const cs = N.normCargos(c.cargos);
    pedirNome(pai === 'lider' ? 'Cargo novo' : 'Cargo novo abaixo de ' + cs[pai].nome, 'Nome do cargo', '', 'Criar', n => {
      mudarCargos(c, 'criar o cargo ' + n, 'criou o cargo ' + n + (pai === 'lider' ? '' : ' abaixo de ' + cs[pai].nome), x => { const r = N.novoCargo(x, pai, n); return r && r.cargos; });
    });
  }
  function renomearCargoDlg(c, id) {
    const cs = N.normCargos(c.cargos), antes = cs[id].nome;
    pedirNome('Renomear o cargo', 'Nome do cargo', antes, 'Salvar', n => mudarCargos(c, 'renomear o cargo ' + antes, 'renomeou o cargo ' + antes + ' para ' + n, x => N.renomearCargo(x, id, n)));
  }
  async function apagarCargoDlg(c, id) {
    const cs = N.normCargos(c.cargos), x = cs[id], abaixo = N.filhos(cs, id).length;
    const txt = (x.gente.length ? 'As pessoas dele saem do clã. ' : '') + (abaixo ? 'Os cargos de baixo sobem para o lugar dele.' : '') || 'Ele está vazio.';
    if (!(await confirmar('Apagar o cargo ' + x.nome + '?', txt, 'Apagar'))) return;
    if (await mudarCargos(c, 'apagar o cargo ' + x.nome, 'apagou o cargo ' + x.nome, y => N.apagarCargo(y, id))) avisoDesfazer('O cargo ' + x.nome + ' foi apagado.');
  }
  function tirarPessoaDo(c, cargo, p) {
    const cs = N.normCargos(c.cargos), q = quemE(p);
    mudarCargos(c, 'tirar ' + q.nome + ' do cargo ' + cs[cargo].nome, 'tirou ' + q.nome + ' do cargo ' + cs[cargo].nome, x => N.tirarPessoa(x, cargo, p.id)).then(f => { if (f) avisoDesfazer(q.nome + ' saiu do cargo ' + cs[cargo].nome + '.'); });
  }
  function pessoaDlg(c, cargo) {
    const cs = N.normCargos(c.cargos), ja = new Set(N.membros(cs).map(m => m.pessoa.pc).filter(Boolean));
    const pcs = personagens().filter(p => !ja.has(p.id));
    let modo = pcs.length ? 'pc' : 'nome';
    const grupos = porCampanha(pcs);
    const sel = h('select', { class: 'in', 'data-k': 'dl:pc', 'aria-label': 'Personagem', style: 'width:100%' },
      grupos.length > 1 || (grupos[0] && grupos[0].nome) ? grupos.map(g => h('optgroup', { label: g.nome || 'Personagens' }, g.itens.map(p => h('option', { value: p.id, text: p.nome + ' · ' + (p.dono ? (p.dono === eu ? 'seu' : nomeDoMembro(p.dono) || 'jogador') : 'NPC') }))))
        : pcs.map(p => h('option', { value: p.id, text: p.nome + ' · ' + (p.dono ? (p.dono === eu ? 'seu' : nomeDoMembro(p.dono) || (naMesa ? 'jogador' : 'teste')) : 'NPC') })));
    const nome = h('input', { class: 'in', type: 'text', maxlength: N.MAX.nomePessoa, 'data-k': 'dl:nome', placeholder: 'Ex.: Oswin, o tesoureiro', 'aria-label': 'Nome' });
    const r1 = h('input', { type: 'radio', name: 'quem', 'data-k': 'dl:modo-pc', checked: modo === 'pc', disabled: !pcs.length, onchange: () => { modo = 'pc'; sel.disabled = false; nome.disabled = true; } });
    const r2 = h('input', { type: 'radio', name: 'quem', 'data-k': 'dl:modo-nome', checked: modo === 'nome', onchange: () => { modo = 'nome'; sel.disabled = true; nome.disabled = false; nome.focus(); } });
    sel.disabled = modo !== 'pc'; nome.disabled = modo !== 'nome';
    const por = () => {
      let pessoa;
      if (modo === 'pc') { const p = pcs.find(y => y.id === sel.value); if (!p) { toast('Escolha um personagem.'); return; } pessoa = { pc: p.id, nome: p.nome }; }
      else { const n = String(nome.value || '').replace(/\s+/g, ' ').trim(); if (!n) { toast('Escreva o nome.'); nome.focus(); return; } pessoa = { nome: n }; }
      fechar();
      mudarCargos(c, 'pôr ' + pessoa.nome + ' no cargo ' + cs[cargo].nome, 'pôs ' + pessoa.nome + ' no cargo ' + cs[cargo].nome, x => { const r = N.porPessoa(x, cargo, pessoa); return r && r.cargos; });
    };
    nome.onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); por(); } };
    abrir('', [h('h2', { text: 'Quem entra em ' + cs[cargo].nome + '?' }),
      h('div', { class: 'corpo' },
        h('label', { class: 'chk' + (pcs.length ? '' : ' off') }, r1, 'Um personagem da mesa'), pcs.length ? sel : h('p', { class: 'ajuda', text: 'Todos os personagens que você vê já estão no clã.' }),
        h('label', { class: 'chk' }, r2, 'Só um nome (alguém que não tem ficha)'), nome),
      pe(btCancelar(), h('button', { type: 'button', class: 'btn pri', 'data-k': 'dl:sim', onclick: por }, 'Pôr no cargo'))]);
    (modo === 'pc' ? sel : nome).focus();
  }
  function moverDlg(c, id) {
    const cs = N.normCargos(c.cargos), abaixo = N.descendentes(cs, id);
    const opcoes = [], anda = (k, prof) => { if (k !== id && !abaixo.has(k)) opcoes.push({ id: k, txt: '\u2003'.repeat(prof) + (k === 'lider' ? cs.lider.nome + ' (logo abaixo do líder)' : cs[k].nome) }); for (const f of N.filhos(cs, k)) if (f !== id) anda(f, prof + 1); };
    anda('lider', 0);
    let pai = cs[id].pai;
    const selPai = h('select', { class: 'in', 'data-k': 'dl:pai', 'aria-label': 'Debaixo de', style: 'width:100%', value: pai }, opcoes.map(o => h('option', { value: o.id, text: o.txt })));
    const selPos = h('select', { class: 'in', 'data-k': 'dl:pos', 'aria-label': 'Posição', style: 'width:100%' });
    const posicoes = () => {
      const irmaos = N.filhos(cs, pai).filter(k => k !== id), atual = pai === cs[id].pai ? N.filhos(cs, pai).indexOf(id) : irmaos.length;
      selPos.replaceChildren(h('option', { value: '0', text: 'Primeiro' }), ...irmaos.map((k, i) => h('option', { value: String(i + 1), text: 'Depois de ' + cs[k].nome })));
      selPos.value = String(Math.min(atual, irmaos.length));
    };
    selPai.onchange = () => { pai = selPai.value; posicoes(); };
    posicoes();
    const mover = () => {
      fechar();
      const pos = Number(selPos.value), paiNome = pai === 'lider' ? 'o líder' : cs[pai].nome;
      mudarCargos(c, 'mover o cargo ' + cs[id].nome, pai !== cs[id].pai ? 'pôs o cargo ' + cs[id].nome + ' abaixo de ' + paiNome : 'mudou a ordem dos cargos', x => N.moverCargo(x, id, pai, pos));
    };
    abrir('', [h('h2', { text: 'Mover o cargo ' + cs[id].nome }), h('p', { text: 'Os cargos de baixo dele vão junto. (Dá também para arrastar o cartão do cargo.)' }),
      h('div', { class: 'corpo' }, h('label', { class: 'field' }, h('span', { text: 'Debaixo de' }), selPai), h('label', { class: 'field' }, h('span', { text: 'Posição' }), selPos)),
      pe(btCancelar(), h('button', { type: 'button', class: 'btn pri', 'data-k': 'dl:sim', onclick: mover }, 'Mover'))]);
    selPai.focus();
  }
  function liderancaDlg(id) {
    const x = clasMestre().find(y => y.id === id);
    if (!x) return;
    const c = x.c, cs = c.cargos, velho = cs.lider.gente[0] || null, ms = N.membros(cs).filter(m => m.cargo !== 'lider');
    const noCla = new Set(N.membros(cs).map(m => m.pessoa.pc).filter(Boolean)), pcs = personagens().filter(p => !noCla.has(p.id));
    const quem = h('select', { class: 'in', 'data-k': 'dl:novo', 'aria-label': 'Quem lidera agora', style: 'width:100%' },
      ms.length ? h('optgroup', { label: 'Do clã' }, ms.map(m => h('option', { value: 'm:' + m.pid, text: quemE(m.pessoa).nome + ' · ' + m.cargoNome }))) : null,
      pcs.length ? h('optgroup', { label: 'Personagens da mesa' }, pcs.map(p => h('option', { value: 'p:' + p.id, text: p.nome + (p.dono ? ' · ' + (nomeDoMembro(p.dono) || (naMesa ? 'jogador' : 'teste')) : ' · NPC') }))) : null,
      h('optgroup', { label: 'Outro' }, h('option', { value: 'n:', text: 'Um nome (alguém sem ficha)…' })));
    const nome = h('input', { class: 'in', type: 'text', maxlength: N.MAX.nomePessoa, 'data-k': 'dl:nome', placeholder: 'O nome de quem lidera', 'aria-label': 'Nome', hidden: true });
    const outros = N.filhos(cs, 'lider').length ? Object.keys(cs).filter(k => k !== 'lider') : [];
    const destino = h('select', { class: 'in', 'data-k': 'dl:velho', 'aria-label': 'O líder de antes fica em', style: 'width:100%' }, h('option', { value: '', text: 'Fora do clã' }), outros.map(k => h('option', { value: k, text: cs[k].nome })));
    const ajustar = () => { const v = quem.value; nome.hidden = v !== 'n:'; if (v.startsWith('m:')) { const m = ms.find(y => 'm:' + y.pid === v); if (m) destino.value = m.cargo; } };
    quem.onchange = ajustar;
    if (outros.length) destino.value = outros.includes((ms[0] || {}).cargo) ? ms[0].cargo : outros[0];
    ajustar();
    const passar = () => {
      const v = quem.value;
      let nova, nomeNovo;
      if (v.startsWith('m:')) { const m = ms.find(y => 'm:' + y.pid === v); nova = { pid: m.pid }; nomeNovo = quemE(m.pessoa).nome; }
      else if (v.startsWith('p:')) { const p = pcs.find(y => 'p:' + y.id === v); nova = { pc: p.id, nome: p.nome }; nomeNovo = p.nome; }
      else { const n = String(nome.value || '').replace(/\s+/g, ' ').trim(); if (!n) { toast('Escreva o nome de quem lidera.'); nome.focus(); return; } nova = { nome: n }; nomeNovo = n; }
      fechar();
      if (mudarCla(id, 'passar a liderança para ' + nomeNovo, y => { const r = N.passarLideranca(y.cargos, nova, destino.value || null); if (!r) return false; y.cargos = r; y.hist = N.anotar(y.hist, { em: agora(), tipo: 'cargo', txt: 'A liderança passou para ' + nomeNovo + '.' }, N.MAX.hist); }))
        avisoDesfazer(nomeNovo + ' agora lidera ' + c.nome + '.');
    };
    abrir('', [h('h2', { text: c.jogadores ? 'Passar a liderança' : 'Trocar o líder' }),
      h('p', { text: c.jogadores ? 'Só o mestre muda quem é o líder. Quem ocupa o cargo de líder (um personagem de jogador) mexe nos outros cargos: cria, renomeia, move e preenche.' : 'Num clã de NPC, o líder é só quem aparece no alto da hierarquia.' }),
      h('div', { class: 'corpo' },
        velho ? h('p', { class: 'ajuda', text: 'Lidera agora: ' + quemE(velho).nome + '.' }) : h('p', { class: 'ajuda', text: 'Ninguém lidera agora.' }),
        h('label', { class: 'field' }, h('span', { text: 'Quem lidera agora' }), quem), nome,
        velho ? h('label', { class: 'field' }, h('span', { text: quemE(velho).nome + ' fica em' }), destino) : null),
      pe(btCancelar(), h('button', { type: 'button', class: 'btn pri', 'data-k': 'dl:sim', onclick: passar }, c.jogadores ? 'Passar a liderança' : 'Trocar o líder'))]);
    quem.focus();
  }

  // os clãs
  function novoClaDlg() {
    const clas = clasMestre(), temJog = clas.some(x => x.c.jogadores);
    const nome = h('input', { class: 'in', type: 'text', maxlength: N.MAX.nome, 'data-k': 'dl:nome', placeholder: temJog ? 'Ex.: Casa Varonil' : 'Ex.: Lâmina do Crepúsculo', 'aria-label': 'Nome do clã' });
    const jog = h('input', { type: 'checkbox', 'data-k': 'dl:jog', checked: !temJog });
    const criar = () => {
      const n = String(nome.value || '').replace(/\s+/g, ' ').trim();
      if (!n) { toast('Dê um nome ao clã.'); nome.focus(); return; }
      fechar();
      const id = N.novoId('cl'), dados = N.claNovo(n, clas.reduce((m, x) => Math.max(m, x.c.ordem + 1), clas.length), jog.checked);
      gravarDoc(PRE_C + id, dados);
      empilhar('criar o clã ' + n, () => { if (naMesa) D.apagar(PRE_C + id); else { delete local[PRE_C + id]; salvarLocal(); } });
      sel = id; aba = 'hier'; pintar();
      avisoDesfazer(jog.checked ? n + ' é o clã dos jogadores: eles já o veem. Ponha alguém na liderança.' : n + ' foi criado, escondido dos jogadores.');
    };
    nome.onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); criar(); } };
    abrir('', [h('h2', { text: 'Clã novo' }), h('div', { class: 'corpo' }, h('label', { class: 'field' }, h('span', { text: 'Nome' }), nome),
      h('label', { class: 'chk' }, jog, 'É o clã dos jogadores (eles veem tudo dele)'),
      h('p', { class: 'ajuda', text: 'Um clã de NPC nasce escondido: você escolhe depois o que os jogadores veem dele.' })),
      pe(btCancelar(), h('button', { type: 'button', class: 'btn pri', 'data-k': 'dl:sim', onclick: criar }, 'Criar'))]);
    nome.focus();
  }
  async function apagarClaDlg(id) {
    const x = clasMestre().find(y => y.id === id);
    if (!x || !(await confirmar('Apagar o clã ' + x.c.nome + '?', 'Ele sai da mesa (e os jogadores deixam de vê-lo). Dá para desfazer.', 'Apagar'))) return;
    const antes = copia(doc(PRE_C + id));
    if (naMesa) D.apagar(PRE_C + id); else { delete local[PRE_C + id]; salvarLocal(); }
    marcarSalvo();
    empilhar('apagar o clã ' + x.c.nome, () => { if (naMesa) D.gravar(PRE_C + id, { dados: antes, vis: 'mestre' }); else { local[PRE_C + id] = antes; salvarLocal(); } sel = id; });
    sel = null; pintar();
    avisoDesfazer('O clã ' + x.c.nome + ' foi apagado.');
  }
  // o brasão: cada escolha vale na hora (um passo de desfazer cada)
  let corAlvo = 0;
  function brasaoDlg(id) {
    corAlvo = 0;
    const muda = (rot, fn) => { mudarCla(id, rot, y => fn(y.brasao), true); desenhar(); pintar(); };
    const desenhar = () => {
      const x = clasMestre().find(y => y.id === id);
      if (!x) { fechar(); return; }
      const b = x.c.brasao, dlg = $('dlg');
      const conteudo = [h('h2', { text: 'O brasão de ' + x.c.nome }),
        h('div', { class: 'brasao-ed' },
          h('div', { class: 'previa', 'data-k': 'br:previa' }, brasaoEl(b, 'dl' + id + Date.now().toString(36))),
          h('div', { class: 'campos' },
            h('div', { class: 'field' }, h('span', { text: 'Forma' }), h('div', { class: 'escolhas', role: 'group', 'aria-label': 'Forma' }, N.FORMAS.map(f => {
              const s = document.createElementNS(NS, 'svg'); s.setAttribute('width', '26'); s.setAttribute('height', '30'); s.setAttribute('viewBox', '0 0 100 120'); s.setAttribute('aria-hidden', 'true');
              s.innerHTML = '<path d="' + f.d + '" fill="currentColor"/>';
              return h('button', { type: 'button', class: 'escolha', 'data-forma': f.id, title: f.nome, 'aria-label': f.nome, 'aria-pressed': String(b.forma === f.id), onclick: () => muda('mudar a forma do brasão', y => { if (y.forma === f.id) return false; y.forma = f.id; }) }, s);
            }))),
            h('div', { class: 'field' }, h('span', { text: 'Divisão' }), h('div', { class: 'escolhas', role: 'group', 'aria-label': 'Divisão' }, N.DIVISOES.map(([d, nm]) => {
              const bt = h('button', { type: 'button', class: 'escolha esc-div', style: 'color:var(--fg)', 'data-div': d, 'aria-pressed': String(b.div === d), onclick: () => muda('mudar a divisão do brasão', y => { if (y.div === d) return false; y.div = d; }) });
              bt.innerHTML = (N.divAmostra ? N.divAmostra(d) : '') + '<span></span>'; bt.lastChild.textContent = nm;
              return bt;
            }))),
            h('div', { class: 'field' }, h('span', { text: 'Cores (escolha qual e depois a cor)' }),
              h('div', { class: 'escolhas', role: 'group', 'aria-label': 'Qual cor' }, [0, 1].map(i => h('button', { type: 'button', class: 'escolha', style: 'color:var(--fg);gap:6px;display:inline-flex', 'data-alvo': String(i), 'aria-pressed': String(corAlvo === i), onclick: () => { corAlvo = i; desenhar(); } },
                h('span', { style: 'width:18px;height:18px;border-radius:5px;display:inline-block;background:' + b.cores[i] }), 'Cor ' + (i + 1)))),
              h('div', { class: 'escolhas', role: 'group', 'aria-label': 'A cor' }, N.CORES.map(cor => h('button', { type: 'button', class: 'escolha cor', 'data-cor': cor, title: cor, 'aria-label': 'Cor ' + cor, 'aria-pressed': String(b.cores[corAlvo] === cor),
                onclick: () => muda('mudar a cor do brasão', y => { if (y.cores[corAlvo] === cor) return false; y.cores[corAlvo] = cor; }) }, h('span', { style: 'background:' + cor }))),
                h('label', { class: 'escolha', style: 'color:var(--fg);gap:6px;display:inline-flex;cursor:pointer' }, 'Outra', h('input', { type: 'color', 'data-k': 'br:outra', value: b.cores[corAlvo], 'aria-label': 'Outra cor',
                  onchange: function () { const v = this.value.toLowerCase(); muda('mudar a cor do brasão', y => { y.cores[corAlvo] = v; }); } })))),
            h('div', { class: 'field' }, h('span', { text: 'Símbolo' }), h('div', { class: 'simbolos', role: 'group', 'aria-label': 'Símbolo' },
              h('button', { type: 'button', class: 'escolha', style: 'color:var(--fg-2);grid-column:span 2', 'data-simb': '', 'aria-pressed': String(!b.simb), onclick: () => muda('tirar o símbolo do brasão', y => { if (!y.simb) return false; y.simb = null; }) }, 'Nenhum'),
              // (lote 45) em grupos: os da Meditação, a heráldica, as classes e as raças
              (N.simbolosEmGrupos ? N.simbolosEmGrupos() : [{ id: 'todos', nome: '', itens: [...N.SIMBOLOS.values()] }]).map(g => [g.nome ? h('small', { class: 'simb-grupo', 'data-sgrupo': g.id, text: g.nome }) : null,
                g.itens.map(s => h('button', { type: 'button', class: 'escolha', 'data-simb': s.id, title: s.nome, 'aria-label': s.nome, 'aria-pressed': String(b.simb === s.id),
                  onclick: () => muda('mudar o símbolo do brasão', y => { if (y.simb === s.id) return false; y.simb = s.id; }) }, icone(s.d, 22)))]))),
            h('div', { class: 'row' },
              h('button', { type: 'button', class: 'btn sm', 'data-k': 'br:img', onclick: () => escolherImagem({ para: 'brasao', id, depois: desenhar }) }, b.img ? 'Trocar a imagem…' : 'Usar uma imagem…'),
              b.img ? h('button', { type: 'button', class: 'btn sm', 'data-k': 'br:sem-img', onclick: () => muda('voltar ao brasão desenhado', y => { y.img = null; }) }, 'Voltar ao desenho') : null,
              h('span', { class: 'ajuda', text: 'O brasão aparece nas bandeiras do salão, na lista dos clãs e nas relações.' })))),
        pe(h('button', { type: 'button', class: 'btn pri', 'data-k': 'dl:fechar', onclick: fechar }, 'Fechar'))];
      if (dlg.open && dlg.dataset.janela === 'brasao:' + id) morphEm(dlg, conteudo);
      else { abrir('largo', conteudo, () => { delete dlg.dataset.janela; }); dlg.dataset.janela = 'brasao:' + id; }
    };
    desenhar();
  }
  // o que os jogadores veem de um clã de NPC: cada marca vale na hora
  function verDlg(id) {
    const desenhar = () => {
      const x = clasMestre().find(y => y.id === id);
      if (!x) { fechar(); return; }
      // (a prévia é a mesma conta do banco, feita aqui: muda na hora, sem esperar a volta da mesa)
      const c = x.c, dlg = $('dlg'), todos = crus(), pub = N.normPub(N.projetar(todos.find(y => y.id === id), todos));
      const marca = (k, rot) => h('label', { class: 'chk' + (c.ver.mostrar ? '' : ' off') }, h('input', { type: 'checkbox', 'data-ver': k, checked: c.ver[k], disabled: !c.ver.mostrar,
        onchange: function () { const sim = this.checked; mudarCla(id, (sim ? 'mostrar ' : 'esconder ') + rot.toLowerCase() + ' de ' + c.nome, y => { y.ver[k] = sim; }, true); desenhar(); pintar(); } }), rot);
      const conteudo = [h('h2', { text: c.nome + ' · o que os jogadores veem' }),
        h('div', { class: 'corpo' },
          h('label', { class: 'chk' }, h('input', { type: 'checkbox', 'data-ver': 'mostrar', checked: c.ver.mostrar,
            onchange: function () { const sim = this.checked; mudarCla(id, (sim ? 'mostrar ' : 'esconder ') + c.nome, y => { y.ver.mostrar = sim; }, true); desenhar(); pintar(); } }), 'O clã aparece para os jogadores (nome, brasão, lema)'),
          h('div', { class: 'niveis', style: 'padding-left:24px' }, N.PARTES.map(([k, rot]) => marca(k, rot))),
          h('p', { class: 'ajuda', text: 'Marcar ou desmarcar vale na hora para os jogadores (com Desfazer). O que fica desmarcado nem chega ao aparelho deles. O respeito de cada membro de um clã de NPC fica sempre com você.' }),
          h('div', { class: 'cartao', 'data-k': 'ver:previa' }, h('div', { class: 'row' }, brasaoEl(c.brasao, 'vp' + id, 'mini'), h('div', { style: 'display:grid;gap:2px' }, h('b', { text: 'Como os jogadores veem' }),
            h('small', { class: 'ajuda', text: pub ? N.PARTES.filter(([k]) => pub.ver[k]).map(([, r]) => r).join(' · ') || 'Só o nome, o brasão e o lema.' : 'Nada: o clã está escondido.' }))))),
        pe(h('button', { type: 'button', class: 'btn pri', 'data-k': 'dl:fechar', onclick: fechar }, 'Fechar'))];
      if (dlg.open && dlg.dataset.janela === 'ver:' + id) morphEm(dlg, conteudo);
      else { abrir('', conteudo, () => { delete dlg.dataset.janela; }); dlg.dataset.janela = 'ver:' + id; }
    };
    desenhar();
  }
  // os nomes dos níveis (valem para a mesa toda)
  function niveisDlg() {
    const nm = nomes(), campos = {};
    const bloco = esc => h('fieldset', { class: 'cartao', style: 'margin:0' }, h('legend', { style: 'font-weight:600;color:var(--fg-2);padding:0 6px', text: N.ESCALA_NOME[esc] }),
      h('div', { class: 'niveis' }, nm[esc].map((n, i) => { const el = h('input', { class: 'in', type: 'text', maxlength: N.MAX.nomeNivel, value: n, 'data-k': 'nv:' + esc + ':' + i, 'aria-label': N.ESCALA_NOME[esc] + ' ' + N.sinal(i - N.NIVEL_MAX) });
        (campos[esc] = campos[esc] || []).push(el); return h('label', null, N.sinal(i - N.NIVEL_MAX), el); })));
    const salvar = () => {
      fechar();
      if (mudarDoc(NOMES, 'renomear os níveis', N.normNomes, d => { for (const esc of Object.keys(campos)) d[esc] = campos[esc].map(el => el.value); })) avisoDesfazer('Os nomes dos níveis mudaram (para a mesa toda).');
    };
    abrir('largo', [h('h2', { text: 'Os nomes dos níveis' }), h('p', { text: 'De −10 a +10, nas três escalas. Valem para todos os clãs da mesa (um nome vazio volta ao de começo).' }),
      h('div', { class: 'corpo' }, ['mundo', 'rel', 'membro'].map(bloco)),
      pe(h('button', { type: 'button', class: 'btn', 'data-k': 'nv:comeco', onclick: () => { for (const esc of Object.keys(campos)) campos[esc].forEach((el, i) => { el.value = N.ESCALAS[esc][i]; }); } }, 'Voltar aos de começo'),
        btCancelar(), h('button', { type: 'button', class: 'btn pri', 'data-k': 'dl:sim', onclick: salvar }, 'Salvar'))]);
  }
  // corrigir o motivo de uma mudança no respeito no mundo (ou tirar a linha)
  function corrigirDlg(id, i) {
    const x = clasMestre().find(y => y.id === id), e = x && x.c.respeito.hist[i];
    if (!e) return;
    const campo = h('input', { class: 'in', type: 'text', maxlength: N.MAX.motivo, value: e.mot, 'data-k': 'dl:mot', 'aria-label': 'Motivo' });
    const mesma = y => y.tipo === 'resp' && y.em === e.em && y.de === e.de && y.para === e.para;
    const gravar = tirar => { fechar(); mudarCla(id, tirar ? 'tirar uma linha do respeito' : 'corrigir o motivo', y => { const k = y.respeito.hist.findIndex(mesma), g = y.hist.findIndex(mesma); if (k < 0) return false;
      if (tirar) { y.respeito.hist.splice(k, 1); if (g >= 0) y.hist.splice(g, 1); } else { const m = String(campo.value || '').replace(/\s+/g, ' ').trim(); y.respeito.hist[k].mot = m; if (g >= 0) y.hist[g].mot = m; } }); };
    campo.onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); gravar(false); } };
    abrir('', [h('h2', { text: 'Corrigir: ' + dia(e.em) + ' · ' + N.sinal(e.para) }), h('label', { class: 'field' }, h('span', { text: 'Motivo' }), campo),
      h('p', { class: 'ajuda', style: 'margin-top:8px', text: 'Tirar a linha não muda o respeito de agora (para isso, use − e +).' }),
      pe(h('button', { type: 'button', class: 'btn per', 'data-k': 'dl:tirar', onclick: () => gravar(true) }, 'Tirar a linha'), btCancelar(), h('button', { type: 'button', class: 'btn pri', 'data-k': 'dl:sim', onclick: () => gravar(false) }, 'Salvar'))]);
    campo.focus();
  }
  // uma relação nova: com outro clã da mesa ou com uma facção do Mapa-múndi
  function relacaoDlg(id) {
    const x = clasMestre().find(y => y.id === id);
    if (!x) return;
    const c = x.c, ja = new Set(c.relacoes.map(r => r.tipo + ':' + r.alvo));
    const clas = clasMestre().filter(y => y.id !== id && !ja.has('cla:' + y.id)), facs = faccoesDoMundo().filter(f => !ja.has('faccao:' + f.id));
    if (!clas.length && !facs.length) { toast('Não há outro clã nem facção do Mapa-múndi para relacionar.'); return; }
    const alvo = h('select', { class: 'in', 'data-k': 'dl:alvo', 'aria-label': 'Com quem', style: 'width:100%' },
      clas.length ? h('optgroup', { label: 'Clãs' }, clas.map(y => h('option', { value: 'cla:' + y.id, text: y.c.nome + (N.visivel(Object.assign({ id: y.id }, y.c)) ? '' : ' (os jogadores não o veem)') }))) : null,
      facs.length ? h('optgroup', { label: 'Facções do Mapa-múndi' }, facs.map(f => h('option', { value: 'faccao:' + f.id, text: f.nome + (f.oculta ? ' (escondida no mapa)' : '') }))) : null);
    const nm = nomes(), valor = h('select', { class: 'in', 'data-k': 'dl:valor', 'aria-label': 'Começa em', value: '0' }, N.NIVEIS.slice().reverse().map(n => h('option', { value: String(n), text: N.nivelTxt(nm, 'rel', n) })));
    valor.value = '0';
    const criar = () => {
      const [tipo, a] = alvo.value.split(':'), v = Number(valor.value) || 0;
      const f = tipo === 'faccao' ? facs.find(y => y.id === a) : null, k = tipo === 'cla' ? clas.find(y => y.id === a) : null;
      if (!f && !k) return;
      fechar();
      const nome = f ? f.nome : k.c.nome;
      if (mudarCla(id, 'pôr a relação com ' + nome, y => { y.relacoes.push(Object.assign({ id: N.novoId('rl'), tipo, alvo: a, v }, f ? { nome: f.nome, cor: f.cor } : {}));
        if (v) y.hist = N.anotar(y.hist, { em: agora(), tipo: 'rel', alvoTipo: tipo, alvo: a, nome, de: 0, para: v, mot: '' }, N.MAX.hist); }))
        avisoDesfazer('Relação com ' + nome + ': ' + N.nivelTxt(nm, 'rel', v) + '.');
    };
    abrir('', [h('h2', { text: 'Relação nova de ' + c.nome }), h('div', { class: 'corpo' }, h('label', { class: 'field' }, h('span', { text: 'Com quem' }), alvo), h('label', { class: 'field' }, h('span', { text: 'Começa em' }), valor),
      h('p', { class: 'ajuda', text: 'Uma relação com um clã que os jogadores não veem não chega a eles (nem as linhas do histórico sobre ele).' })),
      pe(btCancelar(), h('button', { type: 'button', class: 'btn pri', 'data-k': 'dl:sim', onclick: criar }, 'Pôr a relação'))]);
    alvo.focus();
  }
  // um recurso novo (ou renomear um)
  function recursoDlg(id, rec) {
    const x = clasMestre().find(y => y.id === id), r = rec && x ? x.c.recursos.lista.find(y => y.id === rec) : null;
    if (!x || (rec && !r)) return;
    const nome = h('input', { class: 'in', type: 'text', maxlength: N.MAX.nomeRec, value: r ? r.nome : '', 'data-k': 'dl:nome', placeholder: 'Ex.: Ouro', 'aria-label': 'Nome do recurso' });
    const qtd = h('input', { class: 'in', type: 'number', min: 0, max: N.MAX.qtd, step: 1, value: '0', 'data-k': 'dl:qtd', 'aria-label': 'Quanto o clã tem' });
    const usado = r ? x.c.construcoes.filter(k => k.prox.custo.some(y => y.rec === r.id)).map(k => k.nome) : [];
    const salvar = () => {
      const n = String(nome.value || '').replace(/\s+/g, ' ').trim();
      if (!n) { toast('Dê um nome ao recurso.'); nome.focus(); return; }
      fechar();
      if (r) mudarCla(id, 'renomear o recurso ' + r.nome, y => { const z = y.recursos.lista.find(w => w.id === r.id); if (!z || z.nome === n) return false; z.nome = n; });
      else if (mudarCla(id, 'criar o recurso ' + n, y => { y.recursos.lista.push({ id: N.novoId('rc'), nome: n, qtd: Math.max(0, Math.min(N.MAX.qtd, Math.trunc(Number(qtd.value) || 0))) }); })) avisoDesfazer('Recurso criado: ' + n + '.');
    };
    const apagar = async () => {
      fechar();
      if (!(await confirmar('Apagar o recurso ' + r.nome + '?', usado.length ? 'Ele está no custo de: ' + usado.join(', ') + '. Essas construções não sobem de nível até você trocar o custo.' : 'Ele sai da lista do clã.', 'Apagar'))) return;
      if (mudarCla(id, 'apagar o recurso ' + r.nome, y => { y.recursos.lista = y.recursos.lista.filter(w => w.id !== r.id); })) avisoDesfazer('O recurso ' + r.nome + ' saiu.');
    };
    nome.onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); salvar(); } };
    abrir('', [h('h2', { text: r ? 'O recurso ' + r.nome : 'Recurso novo' }), h('div', { class: 'corpo' }, h('label', { class: 'field' }, h('span', { text: 'Nome' }), nome), r ? null : h('label', { class: 'field' }, h('span', { text: 'Quanto o clã tem agora' }), qtd)),
      pe(r ? h('button', { type: 'button', class: 'btn per', 'data-k': 'dl:apagar', onclick: apagar }, 'Apagar o recurso') : null, btCancelar(), h('button', { type: 'button', class: 'btn pri', 'data-k': 'dl:sim', onclick: salvar }, r ? 'Salvar' : 'Criar'))]);
    nome.focus(); if (r) nome.select();
  }
  // uma construção: nova ou editada (tudo de uma vez, ao salvar)
  function construcaoDlg(id, kid) {
    const x = clasMestre().find(y => y.id === id), k = kid && x ? x.c.construcoes.find(y => y.id === kid) : null;
    if (!x || (kid && !k)) return;
    const recs = x.c.recursos.lista;
    let ico = k ? k.ico : 'salao', custo = k ? copia(k.prox.custo) : [];
    const nome = h('input', { class: 'in', type: 'text', maxlength: N.MAX.nomeCons, value: k ? k.nome : '', 'data-k': 'dl:nome', placeholder: 'Ex.: Forja', 'aria-label': 'Nome' });
    const nivel = h('input', { class: 'in', type: 'number', min: 0, max: N.MAX.nivel, step: 1, value: String(k ? k.nivel : 0), 'data-k': 'dl:nivel', 'aria-label': 'Nível', style: 'width:100px' });
    const efeito = h('textarea', { class: 'in', rows: 3, maxlength: N.MAX.efeito, 'data-k': 'dl:efeito', value: k ? k.efeito : '', placeholder: 'O que ela faz pelo clã agora', 'aria-label': 'Efeito' });
    const efeitoNovo = h('textarea', { class: 'in', rows: 2, maxlength: N.MAX.efeito, 'data-k': 'dl:efeito-novo', value: k ? k.prox.efeito : '', placeholder: 'Opcional: o efeito que passa a valer no próximo nível', 'aria-label': 'Efeito novo' });
    const icones = h('div', { class: 'escolhas', role: 'group', 'aria-label': 'Ícone' });
    const pintarIcones = () => icones.replaceChildren(...N.ICONES.map(i => h('button', { type: 'button', class: 'escolha', 'data-ico': i.id, title: i.nome, 'aria-label': i.nome, 'aria-pressed': String(ico === i.id), onclick: () => { ico = i.id; pintarIcones(); } }, icone(i.d, 22))));
    const listaCusto = h('div', { class: 'custo-l', 'data-k': 'dl:custo' });
    /* (lote 8) um recurso que o clã ainda não tem entra direto no custo: escreve o nome; ao salvar, ele entra na lista do
       clã com 0 (o mesmo passo de desfazer). Um nome igual ao de um recurso que já existe usa esse. */
    const NOVO = '__novo__';
    const focarNovo = i => setTimeout(() => { const el = listaCusto.querySelector('[data-k="dl:custo-novo:' + i + '"]'); if (el) el.focus(); }, 0);
    const pintarCusto = () => listaCusto.replaceChildren(
      ...custo.map((y, i) => h('div', { class: 'row' + (y.novo ? ' novo' : '') },
        y.novo ? h('input', { class: 'in nome-novo', type: 'text', maxlength: N.MAX.nomeRec, value: y.nome || '', placeholder: 'Nome do recurso novo (ex.: Mitril)', 'aria-label': 'Nome do recurso novo', 'data-k': 'dl:custo-novo:' + i, oninput: function () { y.nome = this.value; } })
        : h('select', { class: 'in', 'aria-label': 'Recurso', 'data-k': 'dl:custo-rec:' + i, onchange: function () { if (this.value === NOVO) { custo[i] = { novo: true, nome: '', qtd: y.qtd }; pintarCusto(); focarNovo(i); return; } y.rec = this.value; y.nome = (recs.find(r => r.id === this.value) || {}).nome || y.nome; } },
          recs.map(r => h('option', { value: r.id, text: r.nome, selected: r.id === y.rec })), recs.some(r => r.id === y.rec) ? null : h('option', { value: y.rec, text: (y.nome || 'Recurso') + ' (não existe mais)', selected: true }),
          h('option', { value: NOVO, text: '+ Recurso novo…' })),
        y.novo ? h('span', { class: 'tag-novo', title: 'Ao salvar, entra na lista de recursos do clã, com 0' }, 'novo') : null,
        h('input', { class: 'in', type: 'number', min: 1, max: N.MAX.qtd, step: 1, value: String(y.qtd), 'aria-label': 'Quantidade', 'data-k': 'dl:custo-qtd:' + i, oninput: function () { y.qtd = Math.max(1, Math.trunc(Number(this.value) || 1)); } }),
        h('button', { type: 'button', class: 'ib leve', 'aria-label': 'Tirar do custo', onclick: () => { custo.splice(i, 1); pintarCusto(); } }, '×'))),
      h('div', { class: 'row' },
        recs.length ? h('button', { type: 'button', class: 'btn sm tracejado', 'data-k': 'dl:custo-mais', disabled: custo.length >= N.MAX.custo || recs.every(r => custo.some(y => y.rec === r.id)),
          onclick: () => { const livre = recs.find(r => !custo.some(y => y.rec === r.id)); if (livre) { custo.push({ rec: livre.id, nome: livre.nome, qtd: 10 }); pintarCusto(); } } }, '+ recurso no custo') : null,
        h('button', { type: 'button', class: 'btn sm tracejado', 'data-k': 'dl:custo-novo', disabled: custo.length >= N.MAX.custo, title: 'Um recurso que o clã ainda não tem: ao salvar, entra na lista do clã com 0',
          onclick: () => { custo.push({ novo: true, nome: '', qtd: 10 }); pintarCusto(); focarNovo(custo.length - 1); } }, '+ recurso novo no custo')));
    pintarIcones(); pintarCusto();
    for (const el of listaCusto.querySelectorAll('select')) el.value = el.querySelector('option[selected]') ? el.querySelector('option[selected]').value : el.value;
    const salvar = () => {
      const n = String(nome.value || '').replace(/\s+/g, ' ').trim();
      if (!n) { toast('Dê um nome à construção.'); nome.focus(); return; }
      const limpo = v => String(v || '').replace(/\s+/g, ' ').trim();
      const semNome = custo.findIndex(y => y.novo && !limpo(y.nome));
      if (semNome >= 0) { toast('Dê um nome ao recurso novo do custo.'); focarNovo(semNome); return; }
      fechar();
      // (lote 8) os recursos novos do custo entram na lista do clã, com 0, no mesmo passo
      const chave = v => limpo(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const criados = [];
      const montar = y => {
        const lista = custo.map(c => {
          if (!c.novo) return { rec: c.rec, nome: c.nome, qtd: c.qtd };
          const igual = y.recursos.lista.find(r => chave(r.nome) === chave(c.nome));
          if (igual) return { rec: igual.id, nome: igual.nome, qtd: c.qtd };
          if (y.recursos.lista.length >= N.MAX.recursos) return null;
          const r = { id: N.novoId('rc'), nome: limpo(c.nome).slice(0, N.MAX.nomeRec), qtd: 0 };
          y.recursos.lista.push(r); criados.push(r.nome);
          return { rec: r.id, nome: r.nome, qtd: c.qtd };
        }).filter(Boolean);
        return { nome: n, ico, nivel: Math.max(0, Math.min(N.MAX.nivel, Math.trunc(Number(nivel.value) || 0))), efeito: efeito.value, prox: { custo: lista.filter((c, i) => lista.findIndex(z => z.rec === c.rec) === i), efeito: efeitoNovo.value } };
      };
      const novosTxt = () => (criados.length ? ' ' + (criados.length === 1 ? 'Recurso novo' : 'Recursos novos') + ' na lista do clã (com 0): ' + criados.join(', ') + '.' : '');
      if (k) { if (mudarCla(id, 'mudar ' + k.nome, y => { const z = y.construcoes.find(w => w.id === k.id); if (!z) return false; Object.assign(z, montar(y)); }) && criados.length) avisoDesfazer(k.nome + ' mudou.' + novosTxt()); }
      else if (mudarCla(id, 'criar ' + n, y => { y.construcoes.push(Object.assign({ id: N.novoId('ct') }, montar(y))); })) avisoDesfazer(n + ' entrou nas construções.' + novosTxt());
    };
    const apagar = async () => {
      fechar();
      if (!(await confirmar('Apagar ' + k.nome + '?', 'A construção sai do clã (os recursos gastos nela não voltam).', 'Apagar'))) return;
      if (mudarCla(id, 'apagar ' + k.nome, y => { y.construcoes = y.construcoes.filter(w => w.id !== k.id); })) avisoDesfazer(k.nome + ' saiu das construções.');
    };
    abrir('largo', [h('h2', { text: k ? k.nome : 'Construção nova' }),
      h('div', { class: 'corpo' },
        h('div', { class: 'row', style: 'align-items:flex-end' }, h('label', { class: 'field', style: 'flex:1 1 220px' }, h('span', { text: 'Nome' }), nome), h('label', { class: 'field' }, h('span', { text: 'Nível' }), nivel)),
        h('div', { class: 'field' }, h('span', { text: 'Ícone' }), icones),
        h('label', { class: 'field' }, h('span', { text: 'Efeito' }), efeito),
        h('fieldset', { class: 'cartao', style: 'margin:0' }, h('legend', { style: 'font-weight:600;color:var(--fg-2);padding:0 6px', text: 'O próximo nível' }),
          h('div', { class: 'field' }, h('span', { text: 'Custo (sai do cofre do clã ao subir)' }), listaCusto),
          h('label', { class: 'field' }, h('span', { text: 'Efeito novo' }), efeitoNovo))),
      pe(k ? h('button', { type: 'button', class: 'btn per', 'data-k': 'dl:apagar', onclick: apagar }, 'Apagar') : null, btCancelar(), h('button', { type: 'button', class: 'btn pri', 'data-k': 'dl:sim', onclick: salvar }, k ? 'Salvar' : 'Criar'))]);
    nome.focus();
  }

  /* ---------------- imagens (o brasão) ---------------- */
  async function reduzir(arq, lado, tipo) {
    let fonte, w, hh, fecharImg = () => {};
    try { const b = await createImageBitmap(arq); fonte = b; w = b.width; hh = b.height; fecharImg = () => { try { b.close(); } catch (e) { /* já fechada */ } }; }
    catch (e) {
      const u = URL.createObjectURL(arq);
      fecharImg = () => URL.revokeObjectURL(u);
      fonte = await new Promise((ok, falha) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => falha(new Error('Não deu para ler esta imagem.')); im.src = u; });
      w = fonte.naturalWidth; hh = fonte.naturalHeight;
    }
    try {
      if (!w || !hh) throw new Error('Não deu para ler esta imagem.');
      const k = Math.min(1, lado / Math.max(w, hh)), cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(hh * k));
      cv.getContext('2d').drawImage(fonte, 0, 0, cv.width, cv.height);
      const blob = await new Promise(r => cv.toBlob(r, tipo, 0.9));
      if (!blob) throw new Error('Não deu para preparar esta imagem.');
      return blob;
    } finally { fecharImg(); }
  }
  // a imagem pronta para guardar: enviada à mesa (o endereço), ou, fora de uma mesa, embutida (PNG: o brasão pode ter fundo transparente)
  async function prepararImagem(arq, lado) {
    if (!/^image\/(png|jpeg|webp)$/.test(arq.type || '')) throw new Error('Escolha uma imagem PNG, JPG ou WebP.');
    const blob = await reduzir(arq, lado, 'image/png');
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
      const url = await prepararImagem(arq, naMesa ? 480 : 320);
      $('salvo').textContent = '';
      if (alvo.para === 'brasao') { mudarCla(alvo.id, 'usar uma imagem no brasão', y => { y.brasao.img = url; }); if (alvo.depois) alvo.depois(); }
    } catch (e) { $('salvo').textContent = ''; toast((e && e.message) || 'Não deu para usar esta imagem.'); }
  }
  $('arquivo').addEventListener('change', function () { usarImagem(this.files && this.files[0]); });

  /* ---------------- pintar ---------------- */
  function pintar() {
    if (!pronto) return;
    if (SedeUI && SedeUI.ui.arrasto) return;                   // (no meio de um arrasto na Sede: ela pinta ao soltar)
    if (Construtor && Construtor.st.arrasto) return;          // (idem no construtor)
    if (pintando) { pendente = true; return; }
    pintando = true; pendente = false;
    try { pintarJa(); } finally { pintando = false; }
    if (pendente) setTimeout(pintar, 0);
  }
  // (lote 30) a visibilidade de cada sede acompanha o clã (também depois de um Desfazer)
  function sincronizarSedes() {
    if (!naMesa || !mestre) return;
    for (const l of D.todas()) {
      if (typeof l.id !== 'string' || !l.id.startsWith(PRE_SEDE) || l.apagado || !ehObj(l.dados)) continue;
      if (l.vis !== visDe(l.id, l.dados)) D.gravar(l.id, { vis: visDe(l.id, l.dados) });
    }
  }
  function pintarJa() {
    sincronizarSedes();
    sincronizarTropas();                                        // (lote 42) quem recebe as tropas do clã acompanha a liderança
    const bt = $('btDesfazer');
    bt.disabled = !pilha.length;
    bt.title = pilha.length ? 'Desfazer: ' + pilha[pilha.length - 1].rotulo + ' (Ctrl+Z)' : 'Nada para desfazer';
    const xSede = mestre && vista === 'mestre' && sedeAberta && SedeUI ? clasMestre().find(y => y.id === sedeAberta) : null;
    if (!xSede) { sedeAberta = null; if ($('sede').firstChild) $('sede').replaceChildren(); }
    $('sede').hidden = !xSede;
    if (xSede) {
      morphEm($('barra'), barra());
      $('salao').hidden = true; $('nada').hidden = true; $('mestre').hidden = true;
      morphEm($('sede'), [SedeUI.tela(xSede)]);
      if (Construtor && Construtor.aberto()) Construtor.pintar();
      return;
    }
    if (Construtor && Construtor.aberto()) Construtor.fechar();
    if (mestre && vista === 'mestre') {
      morphEm($('barra'), barra());
      $('salao').hidden = true; $('nada').hidden = true; $('mestre').hidden = false;
      morphEm($('mestre'), telaMestre());
      return;
    }
    $('mestre').hidden = true;
    // o salão: quem mestra vê o clã escolhido como os jogadores o recebem; quem joga, os que o mestre mostra
    let c = null, oculto = false;
    if (mestre) {
      const clas = clasMestre();
      if (sel && !clas.some(x => x.id === sel)) sel = null;
      if (!sel && clas.length) sel = clas[0].id;
      const x = clas.find(y => y.id === sel);
      if (x) { c = pubDe(x.id); if (c) c.id = x.id; else { c = N.comoVista(x.c, x.id); oculto = true; } }
    } else {
      const clas = clasDosJogadores();
      if (sel && !clas.some(x => x.id === sel)) sel = null;
      if (!sel && clas.length) sel = clas[0].id;
      const x = clas.find(y => y.id === sel);
      if (x) c = x.c;
    }
    morphEm($('barra'), barra());
    if (!c) {
      $('salao').hidden = true; $('nada').hidden = false;
      morphEm($('nada'), [h('div', { class: 'vazio', 'data-k': 'vazio' }, mestre ? [h('p', { text: 'Nenhum clã ainda.' }), h('p', { class: 'ajuda', text: 'Crie os clãs no painel (Mestre).' })]
        : [h('p', { text: 'Nenhum clã à vista ainda.' }), h('p', { class: 'ajuda', text: 'Quando o mestre mostrar um clã (o de vocês, ou um de NPC), ele aparece aqui.' })])]);
      return;
    }
    $('nada').hidden = true; $('salao').hidden = false;
    pintarSalao(c, mestre ? false : souLider(c), oculto);
  }

  /* ---------------- avisos ---------------- */
  function toast(texto, acaoTxt, fn, ms) {
    const caixa = $('toasts');
    while (caixa.children.length >= 3) caixa.firstElementChild.remove();
    const t = h('div', { class: 'toast', role: 'status' }, h('span', { text: texto }));
    if (acaoTxt) t.append(h('button', { type: 'button', text: acaoTxt, onclick: () => { t.remove(); fn(); } }));
    caixa.append(t);
    setTimeout(() => t.remove(), ms || (acaoTxt ? 8000 : 4500));
  }
  function avisoDesfazer(texto) { const passo = pilha[pilha.length - 1]; toast(texto, 'Desfazer', () => desfazer(passo)); }

  /* ---------------- (lote 30) a Sede ---------------- */
  function abrirSede(id) { sedeAberta = id; pintar(); try { window.scrollTo(0, 0); } catch (e) { /* sem rolagem */ } }
  function fecharSede() { sedeAberta = null; pintar(); }
  const naCasca = () => !!(window.TC && TC.ponte && TC.ponte.ir && TC.ponte.naCasca);
  // escolher um andar (a escada do construtor, quando há mais de um outro andar)
  function escolherAndar(opcoes) {
    return new Promise(resolve => {
      let feito = false;
      const fim = v => { if (feito) return; feito = true; $('dlg').onclose = null; fechar(); resolve(v); };
      abrir('', [h('h2', { text: 'A escada leva a qual andar?' }), h('div', { class: 'row' }, opcoes.map(([v, t]) => h('button', { type: 'button', class: 'btn', 'data-k': 'dl:andar:' + v, onclick: () => fim(v) }, t))),
        pe(h('button', { type: 'button', class: 'btn', 'data-k': 'dl:nao', onclick: () => fim(null) }, 'Cancelar'))], () => fim(null));
    });
  }
  const kitSede = {
    h, toast, avisoDesfazer, doc, mudarDoc, clasMestre, pintar, N, icone, confirmar, abrirSede, fecharSede, naCasca, escolherAndar,
    docs: () => (naMesa ? D.todas() : Object.keys(local).map(id => ({ id, dados: local[id] }))),
    naMesa: () => naMesa, sedeAberta: () => !!sedeAberta, podeDesfazer: () => pilha.length > 0, desfazer: () => desfazer(),
    pedirTexto: (titulo, rotulo, valor) => new Promise(res => pedirNome(titulo, rotulo, valor, 'Salvar', res)),
  };
  const SedeUI = window.ClaSedeUI && window.TC && window.TC.sede ? window.ClaSedeUI(kitSede) : null;
  const Construtor = SedeUI && window.ClaConstrutor ? window.ClaConstrutor(kitSede) : null;
  if (Construtor) { kitSede.construtor = (cla, pr) => Construtor.abrir(cla, pr); kitSede.plantasSalvas = () => Construtor.normPlantas(doc(Construtor.PLANTAS)); kitSede.PLANTAS = Construtor.PLANTAS; kitSede.normPlantas = Construtor.normPlantas; }
  if (SedeUI) kitSede.verNasCenas = (cla, pr) => { const x = clasMestre().find(y => y.id === cla); if (x) SedeUI.verNasCenas(cla, x.c, pr); };

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
      D.aoMudar(l => { if (l && typeof l.id === 'string' && (l.id.startsWith('cla:') || l.id.startsWith('mundo:mapa:') || l.id.startsWith('fichas:tropas:') || l.id === 'fichas:cfg')) pintar(); });     // (cla:sede: também; lote 42: as tropas)
      P.aoMudar(() => pintar());
    } else $('salvo').textContent = 'Neste navegador';
    if (!mestre) vista = 'salao';
    pronto = true;
    pintar();
  }
  if (DEBUG) window.__cla = { N, get naMesa() { return naMesa; }, get mestre() { return mestre; }, get pronto() { return pronto; }, get pilha() { return pilha.map(p => p.rotulo); },
    get sel() { return sel; }, get vista() { return vista; }, get sedeAberta() { return sedeAberta; }, get sedeUI() { return SedeUI; }, abrirSede, get aba() { return aba; }, get ocupado() { return ocupado; }, doc: id => copia(doc(id)), pub: id => copia(pubDe(id)), pintar, desfazer: () => desfazer() };
  partida().catch(e => {
    console.error(e);
    $('nada').hidden = false;
    $('nada').replaceChildren(h('div', { class: 'vazio' }, h('strong', { text: 'Não deu para abrir os clãs da mesa. ' }), (e && e.message) || '', ' ',
      h('button', { type: 'button', class: 'btn sm', text: 'Tentar de novo', onclick: () => location.reload() })));
  });
})();
