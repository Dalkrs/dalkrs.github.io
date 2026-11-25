/* Tiny Cats · Fichas · os vícios (lote 175).
   Na aba "Aptidões" da ficha, junto das aptidões e das desvantagens. Um vício tem a necessidade de 0 a 10, que sobe
   com os dias do mundo (o dia do Mapa-múndi) no ritmo que o mestre escolhe para cada um. "Cumpriu…" baixa a
   necessidade (quanto, o mestre diz; cada vício tem um valor de começo). O buff de cumprir o mestre dá na mão.
   As faixas: Tranquilo · Inquieto · Com fissura · Desesperado.
   O grau (lote 208): Leve, Médio ou Profundo, que o mestre escolhe no editor de cada ficha. É só uma marca (não muda
   conta nenhuma); o jogador também vê. Todo vício tem um: o que não tinha conta como Leve.
   Quem joga vê o nome, a descrição e a necessidade dos que não são secretos. O ritmo, só o mestre.
   A conta é de TC.vicios; a lista inteira fica com o mestre (FichasMesa.listaSegDe(pc, 'vic'), em fichas:segredos).
   A biblioteca: todo vício criado vira um molde (fichas:segredos, vicBib), para pôr o mesmo em outra ficha. */
const FichasVic = (() => {
  'use strict';
  const V = () => window.TC && TC.vicios;
  const M = () => (typeof FichasMesa !== 'undefined' ? FichasMesa : null);
  const X = () => (typeof FichasExtras !== 'undefined' ? FichasExtras : null);
  const q = (el, s) => el.querySelector(s), qa = (el, s) => [...el.querySelectorAll(s)];
  const e = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ICONE = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 14h14v4H3zM17 14h4v4h-4M18 10c0-2 2-2 2-4M15 10c0-2 2-2 2-4"/></svg>';
  const CHAVE_LOCAL = 'tc:vicBib';

  const naMesa = () => !!(M() && M().ativo());
  const mestra = () => !naMesa() || M().mestre();
  const usa = pc => !!pc && !pc.petDe;
  const pcDe = id => (typeof S !== 'undefined' ? (S.personagens || []).find(p => p.id === id) : null) || null;
  const novoId = () => 'vc_' + Math.random().toString(36).slice(2, 10);
  const novoMoldeId = () => 'vm_' + Math.random().toString(36).slice(2, 10);
  const salvar = () => { if (typeof save === 'function') save(); };
  const nomeDe = pc => (pc && pc.nome) || 'o personagem';

  /* ---------- onde mora ---------- */
  function listaDe(pc) {
    if (!V() || !pc) return [];
    if (!mestra()) return V().doJogador(pc.estado);
    const seg = naMesa() ? M().listaSegDe(pc, 'vic') : null;
    return V().norm(seg || (pc.estado && pc.estado.vic) || []);
  }
  function gravar(pc, lista, semSalvar) {
    const est = Object.assign({}, pc.estado || {});
    if (naMesa()) { M().porListaSeg(pc, 'vic', lista); const pub = V().publica(lista); if (pub.length) est.vic = pub; else delete est.vic; }
    else if (lista.length) est.vic = lista; else delete est.vic;
    pc.estado = est;
    if (!semSalvar) salvar();
  }
  // quantos estão com fissura ou desesperados (o "!" da aba)
  const alerta = pc => (V() && usa(pc) ? listaDe(pc).filter(v => V().faixa(v.nec).i >= 2).length : 0);
  const fichas = () => (typeof S !== 'undefined' ? (S.personagens || []) : []).filter(usa);
  const todasListas = () => { const o = {}; for (const pc of fichas()) o[pc.id] = listaDe(pc); return o; };

  /* ---------- a biblioteca ---------- */
  function bibDe() {
    if (!V()) return [];
    if (naMesa()) return V().normBib(M().mestre() && S.segredos && S.segredos.vicBib);
    try { return V().normBib(JSON.parse(localStorage.getItem(CHAVE_LOCAL) || '[]')); } catch (_) { return []; }
  }
  function porBib(lista) {
    const b = V().normBib(lista);
    if (naMesa()) {
      if (!M().mestre()) return;
      const s = S.segredos && typeof S.segredos === 'object' && !Array.isArray(S.segredos) ? S.segredos : (S.segredos = {});
      if (b.length) s.vicBib = b; else delete s.vicBib;
    } else { try { if (b.length) localStorage.setItem(CHAVE_LOCAL, JSON.stringify(b)); else localStorage.removeItem(CHAVE_LOCAL); } catch (_) { /* sem espaço */ } }
  }
  // depois de criar ou editar: o molde guarda o texto e o ritmo mais novos, e as outras fichas ligadas recebem o mesmo
  function espalhar(pc, v) {
    if (!v || !v.m) return 0;
    const mo = V().moldeDoVicio(v, v.m), b = bibDe().filter(x => x.id !== v.m);
    b.push(mo); porBib(b);
    let n = 0;
    for (const outro of fichas()) {
      if (outro.id === pc.id) continue;
      const r = V().aplicarMolde(listaDe(outro), mo);
      if (r.mudou) { gravar(outro, r.lista, true); n++; }
    }
    return n;
  }
  const foto = () => ({ bib: bibDe(), listas: todasListas() });
  function voltarFoto(f) {
    for (const pid of Object.keys(f.listas)) { const pc = pcDe(pid); if (pc) gravar(pc, f.listas[pid], true); }
    porBib(f.bib); salvar();
    for (const pid of Object.keys(f.listas)) { const pc = pcDe(pid); if (pc) repintar(pc); }
  }

  /* ---------- o dia do mundo ---------- */
  function hojeDoMundo() {
    try { const c = naMesa() ? M().calendario() : null; return c && Number.isFinite(c.dia) ? { dia: c.dia, mp: c.mapaId || '' } : null; } catch (_) { return null; }
  }
  /* Os dias que passaram no Mapa-múndi: soma o ritmo de cada vício (só quem mestra grava). Avisa quem mudou de faixa
     para cima. Pode ser chamada à vontade: só mexe quando o dia mudou. */
  let contando = false;
  function avancarTudo() {
    if (contando || !V() || !naMesa() || !M().mestre()) return false;
    const h = hojeDoMundo();
    if (!h) return false;
    contando = true;
    try {
      const subiram = [], mudaram = [];
      for (const pc of fichas()) {
        const l = listaDe(pc);
        if (!l.length) continue;
        const r = V().avancar(l, h.dia, h.mp);
        if (!r.mudou) continue;
        gravar(pc, r.lista, true); mudaram.push(pc);
        for (const s of r.subiram) subiram.push(s.n + ' de ' + nomeDe(pc) + ': ' + s.para.n);
      }
      if (!mudaram.length) return false;
      salvar();
      for (const pc of mudaram) repintar(pc);
      const ex = X();
      if (ex && subiram.length) ex.aviso('Os dias passaram. ' + subiram.slice(0, 4).join(' · ') + (subiram.length > 4 ? ' · e mais ' + (subiram.length - 4) : '') + '.', null, null, 10000);
      return true;
    } finally { contando = false; }
  }

  /* ---------- uma mudança (com "Desfazer") ---------- */
  function mexer(pc, op, avisar, focar) {
    if (!V() || !mestra()) return;
    const molde = op && (op.t === 'nova' || op.t === 'editar'), f0 = molde ? foto() : null;
    if (op && op.t === 'nova' && !op.m) op = Object.assign({}, op, { m: novoMoldeId() });
    if (op && op.t === 'nova') { const h = hojeDoMundo(); if (h) op = Object.assign({}, op, { dia: h.dia, mp: h.mp }); }
    const antes = listaDe(pc), r = V().mudar(antes, op);
    if (!r.mudou) return;
    gravar(pc, r.lista, molde);
    const outras = molde ? espalhar(pc, r.a) : 0;
    if (molde) salvar();
    repintar(pc, focar);
    if (outras) for (const o of fichas()) if (o.id !== pc.id) repintar(o);
    const ex = X(); if (!ex) return;
    if (molde) { ex.aviso(avisar + (outras ? ' Também mudou em ' + (outras === 1 ? 'outra ficha' : outras + ' outras fichas') + '.' : ''), 'Desfazer', () => voltarFoto(f0)); return; }
    const fx = r.a && r.antes && r.depois && r.antes.i !== r.depois.i ? ' Agora: ' + r.depois.n + '.' : '';
    if (avisar) ex.aviso(avisar + fx, 'Desfazer', () => { gravar(pc, antes); repintar(pc); });
    else if (fx) ex.aviso(r.a.n + ' de ' + nomeDe(pc) + ':' + fx, 'Desfazer', () => { gravar(pc, antes); repintar(pc); });
  }

  /* ---------- o desenho ---------- */
  // a barra de 0 a 10, com a cor da faixa
  function barra(nec) {
    const f = V().faixa(nec), pct = Math.round(Math.max(0, Math.min(10, nec)) * 10);
    return `<div class="vicbar" role="img" aria-label="${e('Necessidade ' + V().num(nec) + ' de 10: ' + f.n)}"><i style="width:${pct}%;background:${f.cor}"></i><b></b><b></b><b></b></div>`;
  }
  const tagGrau = g => { const x = V().grau(g); return `<span class="vicg vicg-${x.k}" style="--vg:${x.cor}" title="${e('Grau do vício: ' + x.n)}">${e(x.n)}</span>`; };
  const tagFaixa = nec => { const f = V().faixa(nec); return `<span class="vicfx vicfx-${f.k}" style="--fx:${f.cor}">${e(f.n)}</span>`; };
  function cartaoMestre(pc, v, curto) {
    const k = e(pc.id + '|' + v.id);
    const olho = naMesa() ? `<button type="button" class="olho" data-vicolho="${k}" aria-pressed="${!v.oc}" title="${v.oc ? 'Secreto: o jogador não vê este vício. Clique para mostrar.' : 'O jogador vê o nome, a descrição e a necessidade. Clique para deixar secreto.'}" aria-label="${e(v.n + ': ' + (v.oc ? 'secreto' : 'o jogador vê'))}">${v.oc ? M().OLHO_FECHADO : M().OLHO}</button>` : '';
    return `<div class="aptcard viccard${v.oc ? ' guardada' : ''} fx-${V().faixa(v.nec).k}" data-vicc="${k}">
      <div class="apttopo"><b class="aptnome">${e(v.n)}</b>${tagGrau(v.g)}${tagFaixa(v.nec)}
        ${v.oc && naMesa() ? '<span class="tagseg" title="Só você vê este vício">secreto</span>' : ''}
        <span class="aptacoes">${olho}<button type="button" class="mini" data-viced="${k}">Editar</button></span></div>
      ${!curto && v.d ? `<p class="aptd">${e(v.d)}</p>` : ''}
      <div class="aptlinha">${barra(v.nec)}<span class="aptxp">${V().num(v.nec)} / 10</span></div>
      <div class="hint vicrit">${e(V().textoRitmo(v))} · cumprir baixa ${V().num(v.bx)}</div>
      <div class="aptmais">
        <button type="button" class="mini" data-vicnec="${k}|-1" title="Baixar 1">−1</button><button type="button" class="mini" data-vicnec="${k}|1" title="Subir 1">+1</button>
        <input type="text" inputmode="decimal" data-vicconta="${k}" placeholder="+2 −1" aria-label="${e('Necessidade de ' + v.n + ': escreva +2, −1 ou +2 −1 e aperte Enter')}" autocomplete="off">
        <button type="button" class="primary mini" data-viccumpre="${k}">Cumpriu…</button>
      </div>
    </div>`;
  }
  function cartaoJogador(v) {
    return `<div class="aptcard viccard fx-${V().faixa(v.nec).k}"><div class="apttopo"><b class="aptnome">${e(v.n)}</b>${tagGrau(v.g)}${tagFaixa(v.nec)}</div>
      ${v.d ? `<p class="aptd">${e(v.d)}</p>` : ''}<div class="aptlinha">${barra(v.nec)}</div></div>`;
  }
  function painel(pc) {
    if (!V() || !usa(pc)) return '';
    const ls = listaDe(pc), M_ = mestra();
    if (!M_ && !ls.length) return '';
    const vazio = 'Nenhum vício. Crie um quando o personagem ficar preso a algo (ex.: Cigarro, Bebida, Jogo).';
    const dica = M_ ? (naMesa() ? (hojeDoMundo() ? 'sobe com os dias do Mapa-múndi · o buff de cumprir é com você' : 'sem mapa com calendário: suba na mão') : 'fora da mesa: suba na mão') : 'a necessidade de cumprir o vício';
    return `<div class="panel" id="painelVic" data-vicpc="${e(pc.id)}" style="margin-top:14px">
      <div class="hd"><span class="eyebrow">${ICONE} Vícios</span>
        <span class="hint" style="margin-left:auto">${dica}</span>
        ${M_ ? '<button type="button" class="mini primary" data-vicnova>+ Novo vício</button>' : ''}</div>
      <div class="bd"><div class="apts">${ls.map(v => (M_ ? cartaoMestre(pc, v) : cartaoJogador(v))).join('') || `<div class="hint">${vazio}</div>`}</div></div>
    </div>`;
  }
  function quadroMesa() {
    if (!V() || !mestra() || typeof S === 'undefined') return '';
    const camp = naMesa() ? M().campEmVista() : null;
    const pcs = fichas().filter(pc => (naMesa() ? M().deJogador(pc) && !M().encerrada(pc._camp) && (!camp || !pc._camp || pc._camp === camp) : true));
    const blocos = pcs.map(pc => {
      const ls = listaDe(pc), n = ls.filter(v => V().faixa(v.nec).i >= 2).length;
      return `<div class="aptpc"><div class="aptpchd"><b>${e(pc.nome || 'Sem nome')}</b>${n ? `<span class="vicalto">${n === 1 ? '1 com necessidade alta' : n + ' com necessidade alta'}</span>` : ''}
        <button type="button" class="mini" data-vicnovapc="${e(pc.id)}" style="margin-left:auto">+ Vício</button></div>
        <div class="apts curto">${ls.map(v => cartaoMestre(pc, v, true)).join('') || '<div class="hint">Nenhum vício.</div>'}</div></div>`;
    }).join('');
    return `<div class="panel" id="vicMesa" style="margin-top:18px">
      <div class="hd"><span class="eyebrow">${ICONE} Vícios dos personagens</span><span class="hint" style="margin-left:auto">a necessidade sobe com os dias · "Cumpriu…" baixa</span></div>
      <div class="bd">${blocos || '<div class="hint">Nenhum personagem de jogador ainda.</div>'}</div></div>`;
  }

  /* ---------- o editor ---------- */
  function editor(pc, vid) {
    const ex = X(); if (!ex || !V() || !mestra()) return;
    const v = (vid ? listaDe(pc).find(x => x.id === vid) : null), P = V().PADRAO;
    const w = v || { n: '', d: '', g: 'leve', nec: 0, rit: P.rit, bx: P.bx, oc: false };
    const ligadas = v && v.m ? (V().usos(todasListas())[v.m] || []).filter(id => id !== pc.id).map(id => (pcDe(id) || {}).nome || 'sem nome') : [];
    const { m, fechar } = ex.janela(v ? 'Vício de ' + nomeDe(pc) : 'Novo vício para ' + nomeDe(pc), `
      ${ligadas.length ? `<p class="hint" style="margin:0 0 8px">Este vício também está ${ligadas.length === 1 ? 'na ficha de ' + e(ligadas[0]) : 'em ' + ligadas.length + ' outras fichas (' + e(ligadas.join(', ')) + ')'}. Mudar o nome, a descrição, o ritmo ou o quanto baixa muda em todas. A necessidade de cada ficha não muda.</p>` : ''}
      <label class="f"><span class="eyebrow">Nome</span><input data-vicn maxlength="${V().LIM.nome}" value="${e(w.n)}" placeholder="ex.: Cigarro" autocomplete="off"></label>
      <label class="f"><span class="eyebrow">Descrição curta (o jogador vê)</span><textarea rows="2" data-vicd maxlength="${V().LIM.desc}" placeholder="ex.: Fuma desde menino; sem tabaco, fica irritado.">${e(w.d)}</textarea></label>
      <div class="f"><span class="eyebrow">Grau (o jogador vê)</span>
        <div class="vicgraus" role="radiogroup" aria-label="Grau do vício">${V().GRAUS.map(x => `<label class="vicgopc" style="--vg:${x.cor}"><input type="radio" name="vicg" value="${x.k}" data-vicg ${V().grauOk(w.g) === x.k ? 'checked' : ''}><span>${e(x.n)}</span></label>`).join('')}</div></div>
      <div class="aptnums vicnums">
        <label class="f"><span class="eyebrow">Sobe por dia</span><input type="number" min="0" max="10" step="0.5" data-vicrit value="${w.rit}"></label>
        <label class="f"><span class="eyebrow">Cumprir baixa</span><input type="number" min="0.5" max="10" step="0.5" data-vicbx value="${w.bx}"></label>
        <label class="f"><span class="eyebrow">Necessidade agora</span><input type="number" min="0" max="10" step="0.5" data-vicnecv value="${w.nec}"></label>
      </div>
      <p class="hint" style="margin:6px 0 0">De 0 a 10: 0–2 Tranquilo · 3–5 Inquieto · 6–8 Com fissura · 9–10 Desesperado. "Sobe por dia" conta os dias do Mapa-múndi.</p>
      ${naMesa() ? `<label class="chk" style="display:flex;gap:6px;align-items:center;margin:8px 0"><input type="checkbox" data-vicoc ${w.oc ? 'checked' : ''}> Secreto (o jogador não vê este vício)</label>` : ''}
      <p class="hint itjerro" data-vicerro hidden></p>
      <div class="modalacts">${v ? '<button type="button" class="danger" data-victira>Tirar vício</button>' : ''}<span style="margin-left:auto;display:flex;gap:8px"><button type="button" data-jcancela>Cancelar</button><button type="button" class="primary" data-vicok>${v ? 'Salvar' : 'Criar'}</button></span></div>`, 520);
    const nome = q(m, '[data-vicn]'), erro = q(m, '[data-vicerro]');
    nome.focus();
    q(m, '[data-vicok]').onclick = () => {
      const n = nome.value.trim();
      if (!n) { erro.textContent = 'Escreva o nome do vício.'; erro.hidden = false; nome.focus(); return; }
      const oc = q(m, '[data-vicoc]');
      const gEl = q(m, '[data-vicg]:checked');
      const campos = { n, d: q(m, '[data-vicd]').value, g: gEl ? gEl.value : 'leve', rit: +q(m, '[data-vicrit]').value, bx: +q(m, '[data-vicbx]').value, nec: +q(m, '[data-vicnecv]').value, oc: oc ? oc.checked : false };
      fechar();
      if (v) mexer(pc, Object.assign({ t: 'editar', id: v.id }, campos), 'O vício ' + n + ' foi salvo.');
      else mexer(pc, Object.assign({ t: 'nova', id: novoId() }, campos), 'O vício ' + n + ' foi criado para ' + nomeDe(pc) + '.');
    };
    const tira = q(m, '[data-victira]');
    if (tira) tira.onclick = () => {
      if (tira.dataset.certeza !== '1') { tira.dataset.certeza = '1'; tira.textContent = 'Clique de novo para tirar'; return; }
      fechar(); mexer(pc, { t: 'tirar', id: v.id }, 'O vício ' + v.n + ' saiu da ficha de ' + nomeDe(pc) + '.');
    };
  }
  // "Cumpriu…": quanto baixa (o valor de começo do vício)
  function cumprir(pc, vid) {
    const ex = X(), v = listaDe(pc).find(x => x.id === vid); if (!ex || !v) return;
    const { m, fechar } = ex.janela('Cumpriu: ' + v.n, `
      <p class="hint" style="margin:0 0 8px">${e(nomeDe(pc))} está ${e(V().faixa(v.nec).n.toLowerCase())} (${V().num(v.nec)} de 10). Quanto a necessidade baixa? O buff você dá na mão.</p>
      <label class="f"><span class="eyebrow">Baixa</span><input type="number" min="0.5" max="10" step="0.5" data-vicbaixa value="${v.bx}"></label>
      <div class="modalacts"><span style="margin-left:auto;display:flex;gap:8px"><button type="button" data-jcancela>Cancelar</button><button type="button" class="primary" data-vicbaixaok>Baixar</button></span></div>`, 400);
    const inp = q(m, '[data-vicbaixa]'), ok = () => {
      const d = Number(String(inp.value).replace(',', '.'));
      if (!(d > 0)) { inp.focus(); return; }
      fechar(); mexer(pc, { t: 'cumprir', id: vid, d }, v.n + ' de ' + nomeDe(pc) + ': a necessidade baixou ' + V().num(d) + '.');
    };
    inp.select(); inp.onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); ok(); } };
    q(m, '[data-vicbaixaok]').onclick = ok;
  }
  // "+ Novo vício": a biblioteca
  function escolher(pc) {
    const ex = X(); if (!ex || !V() || !mestra()) return;
    const corpo = () => {
      const bib = bibDe(), us = V().usos(todasListas()), tem = new Set(listaDe(pc).map(v => v.m).filter(Boolean));
      const linha = mo => {
        const quem = us[mo.id] || [], ja = tem.has(mo.id);
        return `<div class="aptbib" data-vicbib="${e(mo.id)}" data-busca="${e(V().chave(mo.n + ' ' + mo.d))}">
          <div class="aptbibt"><b>${e(mo.n)}</b><span class="hint">${e(V().textoRitmo(mo))} · cumprir baixa ${V().num(mo.bx)} · ${quem.length === 1 ? 'em 1 ficha' : 'em ' + quem.length + ' fichas'}</span>
            ${mo.d ? `<span class="aptd">${e(mo.d)}</span>` : ''}</div>
          <span class="aptbiba">${ja ? '<span class="hint">já está nesta ficha</span>' : `<button type="button" class="mini primary" data-vicpor="${e(mo.id)}">Pôr na ficha</button>`}
            ${quem.length ? '' : `<button type="button" class="mini danger" data-victirabib="${e(mo.id)}" title="Nenhuma ficha usa: pode tirar da biblioteca">Tirar</button>`}</span>
        </div>`;
      };
      return `<p class="hint" style="margin:0 0 8px">Todo vício que você cria fica guardado aqui. Puxe um para ${e(nomeDe(pc))}: começa com a necessidade em 0.</p>
        ${bib.length > 6 ? '<input class="inm" data-vicbusca placeholder="Procurar (ex.: Cigarro)" aria-label="Procurar na biblioteca de vícios" autocomplete="off" style="width:100%;margin-bottom:8px">' : ''}
        <div class="aptbibl">${bib.map(linha).join('') || '<p class="hint" style="margin:0">A biblioteca ainda está vazia. O primeiro vício que você criar entra nela.</p>'}</div>
        <div class="modalacts"><span style="margin-left:auto;display:flex;gap:8px"><button type="button" data-jcancela>Cancelar</button><button type="button" class="primary" data-viccriar>+ Criar um novo</button></span></div>`;
    };
    const { m, fechar } = ex.janela('Vício para ' + nomeDe(pc), corpo(), 600);
    const ligarJ = () => {
      q(m, '[data-viccriar]').onclick = () => { fechar(); editor(pc, null); };
      const busca = q(m, '[data-vicbusca]');
      if (busca) { busca.focus(); busca.oninput = () => { const t = V().chave(busca.value); qa(m, '[data-vicbib]').forEach(l => { l.hidden = !!t && !l.dataset.busca.includes(t); }); }; }
      qa(m, '[data-vicpor]').forEach(b => b.onclick = () => {
        const mo = bibDe().find(x => x.id === b.dataset.vicpor), v = mo && V().doMolde(mo, novoId());
        if (!v) return;
        fechar();
        mexer(pc, Object.assign({ t: 'nova' }, v), 'O vício ' + v.n + ' foi posto na ficha de ' + nomeDe(pc) + '.');
      });
      qa(m, '[data-victirabib]').forEach(b => b.onclick = () => {
        if (b.dataset.certeza !== '1') { b.dataset.certeza = '1'; b.textContent = 'Clique de novo'; return; }
        const antes = bibDe(), mo = antes.find(x => x.id === b.dataset.victirabib);
        porBib(antes.filter(x => x.id !== b.dataset.victirabib)); salvar();
        const bd = q(m, '.bd'); bd.innerHTML = corpo(); qa(m, '[data-jcancela]').forEach(x => x.onclick = fechar); ligarJ();
        if (mo) ex.aviso('O vício ' + mo.n + ' saiu da biblioteca.', 'Desfazer', () => { porBib(antes); salvar(); });
      });
    };
    ligarJ();
  }

  /* ---------- os cliques ---------- */
  const partes = k => { const i = k.indexOf('|'); return [pcDe(k.slice(0, i)), k.slice(i + 1)]; };
  function ligar(host, pcFicha) {
    if (!host || !mestra()) return;
    const nova = q(host, '[data-vicnova]'); if (nova && pcFicha) nova.onclick = () => escolher(pcFicha);
    qa(host, '[data-vicnovapc]').forEach(b => b.onclick = () => { const pc = pcDe(b.dataset.vicnovapc); if (pc) escolher(pc); });
    qa(host, '[data-viced]').forEach(b => b.onclick = () => { const [pc, id] = partes(b.dataset.viced); if (pc) editor(pc, id); });
    qa(host, '[data-viccumpre]').forEach(b => b.onclick = () => { const [pc, id] = partes(b.dataset.viccumpre); if (pc) cumprir(pc, id); });
    qa(host, '[data-vicnec]').forEach(b => b.onclick = () => { const k = b.dataset.vicnec, j = k.lastIndexOf('|'), [pc, id] = partes(k.slice(0, j)); if (pc) mexer(pc, { t: 'nec', id, d: +k.slice(j + 1) }, null, '[data-vicnec="' + k + '"]'); });
    qa(host, '[data-vicolho]').forEach(b => b.onclick = () => {
      const [pc, id] = partes(b.dataset.vicolho), v = pc && listaDe(pc).find(x => x.id === id); if (!v) return;
      const dono = (M().nomeDoDono && M().nomeDoDono(pc)) || 'O jogador';
      mexer(pc, { t: 'oc', id, v: !v.oc }, v.oc ? dono + ' agora vê o vício ' + v.n + '.' : 'O vício ' + v.n + ' ficou secreto.', '[data-vicolho="' + b.dataset.vicolho + '"]');
    });
    qa(host, '[data-vicconta]').forEach(i => i.onkeydown = ev => {
      if (ev.key !== 'Enter') return;
      ev.preventDefault();
      const d = V().conta(i.value), [pc, id] = partes(i.dataset.vicconta);
      if (d == null) { i.setCustomValidity('Escreva só números com sinal: +2, −1 ou +2 −1.'); i.reportValidity(); return; }
      i.setCustomValidity('');
      if (pc && d) mexer(pc, { t: 'nec', id, d }, null, '[data-vicconta="' + i.dataset.vicconta + '"]');
    });
    setTimeout(avancarTudo, 0);            // (os dias que passaram no Mapa-múndi desde a última vez)
  }
  function repintar(pc, focar) {
    const troca = (el, html, pcF) => {
      if (!el) return;
      const t = document.createElement('div'); t.innerHTML = html; const novo = t.firstElementChild;
      if (!novo) { el.remove(); return; }
      el.replaceWith(novo); ligar(novo, pcF);
      if (focar) { const f = novo.querySelector(focar); if (f) f.focus(); }
    };
    const pf = document.getElementById('painelVic');
    if (pf && pf.dataset.vicpc === pc.id) troca(pf, painel(pc), pc);
    troca(document.getElementById('vicMesa'), quadroMesa(), null);
    if (typeof atualizarMarcaAptidoes === 'function') atualizarMarcaAptidoes(pc);
  }
  return { painel, ligar, quadroMesa, listaDe, alerta, usa, editor, escolher, cumprir, bibDe, avancarTudo };
})();
