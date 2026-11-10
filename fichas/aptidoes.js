/* Tiny Cats · Fichas · as aptidões (lote 131).
   A aba "Aptidões" da ficha: o que o personagem faz cada vez melhor com a prática (Furtividade, Rastreio, Pescar…).
   Só quem mestra cria, uma a uma, e cada uma tem a barrinha secreta de XP: +1/+5 ou "+15 -4" (Enter). Cheia, o botão
   "Subir de nível" acende. O mestre também escreve o que cada nível dá e pode deixar uma aptidão secreta.
   Quem joga vê o nome, a descrição e o nível das que não são secretas — sem a barra e sem o texto do nível.
   Na aba Mesa (só do mestre), o quadro "Aptidões dos personagens" junta as de todos os personagens de jogador, para dar
   XP sem abrir ficha por ficha.
   A conta é de TC.aptidoes; a lista inteira fica com o mestre (FichasMesa.aptSegDe / porAptSeg, em fichas:segredos). */
const FichasApt = (() => {
  'use strict';
  const A = () => window.TC && TC.aptidoes;
  const M = () => (typeof FichasMesa !== 'undefined' ? FichasMesa : null);
  const X = () => (typeof FichasExtras !== 'undefined' ? FichasExtras : null);
  const q = (el, s) => el.querySelector(s), qa = (el, s) => [...el.querySelectorAll(s)];
  const e = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ICONE = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h16M7 16l3-8 4 5 3-9"/></svg>';

  const naMesa = () => !!(M() && M().ativo());
  const mestra = () => !naMesa() || M().mestre();
  const usa = pc => !!pc && !pc.petDe;
  const pcDe = id => (typeof S !== 'undefined' ? (S.personagens || []).find(p => p.id === id) : null) || null;
  const novoId = () => 'ap_' + Math.random().toString(36).slice(2, 10);

  // a lista inteira (quem mestra) ou a que o jogador vê
  function listaDe(pc) {
    if (!A() || !pc) return [];
    if (!mestra()) return A().doJogador(pc.estado);
    const seg = naMesa() ? M().aptSegDe(pc) : null;
    return A().norm(seg || (pc.estado && pc.estado.apt) || []);
  }
  const prontasDe = pc => (mestra() && A() ? A().prontas(listaDe(pc)).length : 0);
  function gravar(pc, lista) {
    const est = Object.assign({}, pc.estado || {});
    if (naMesa()) { M().porAptSeg(pc, lista); const pub = A().publica(lista); if (pub.length) est.apt = pub; else delete est.apt; }
    else if (lista.length) est.apt = lista; else delete est.apt;
    pc.estado = est;
    if (typeof save === 'function') save();
  }
  // uma mudança (com "Desfazer"); avisa quando a barra acabou de encher
  function mexer(pc, op, avisar, focar) {
    if (!A() || !mestra()) return;
    const antes = listaDe(pc), r = A().mudar(antes, op);
    if (!r.mudou) return;
    gravar(pc, r.lista);
    repintar(pc, focar);
    const ex = X(); if (!ex) return;
    const nome = pc.nome || 'O personagem';
    if (r.pronta && r.a) ex.aviso(r.a.n + ' de ' + nome + ' pode subir de nível.', 'Subir agora', () => mexer(pc, { t: 'subir', id: r.a.id }, 'subiu'), 10000);
    else if (avisar === 'subiu' && r.a) ex.aviso(r.a.n + ' de ' + nome + ' subiu para o nível ' + r.a.nv + '.', 'Desfazer', () => { gravar(pc, antes); repintar(pc); });
    else if (avisar) ex.aviso(avisar, 'Desfazer', () => { gravar(pc, antes); repintar(pc); });
  }

  /* ---------- o desenho ---------- */
  function barra(a) {
    const pct = Math.round(A().fracao(a) * 100), teto = A().noTeto(a);
    return `<div class="aptbar${A().pronta(a) ? ' cheia' : ''}" role="img" aria-label="${e(teto ? 'Nível máximo' : 'XP ' + a.xp + ' de ' + a.max)}"><i style="width:${pct}%"></i></div>
      <span class="aptxp">${teto ? 'nível máximo' : a.xp + ' / ' + a.max + ' XP'}</span>`;
  }
  // um cartão (quem mestra); `chave` = "personagem|aptidão"
  function cartaoMestre(pc, a, curto) {
    const k = e(pc.id + '|' + a.id), pr = A().pronta(a), tx = A().textoDoNivel(a);
    const olho = naMesa() ? `<button type="button" class="olho" data-aptolho="${k}" aria-pressed="${!a.oc}" title="${a.oc ? 'Secreta: o jogador não vê esta aptidão. Clique para mostrar.' : 'O jogador vê o nome, a descrição e o nível. Clique para deixar secreta.'}" aria-label="${e(a.n + ': ' + (a.oc ? 'secreta' : 'o jogador vê'))}">${a.oc ? M().OLHO_FECHADO : M().OLHO}</button>` : '';
    return `<div class="aptcard${a.oc ? ' guardada' : ''}${pr ? ' pronta' : ''}" data-aptc="${k}">
      <div class="apttopo"><b class="aptnome">${e(a.n)}</b><span class="aptnv">Nível ${a.nv}<small> de ${a.teto}</small></span>
        ${a.oc && naMesa() ? '<span class="tagseg" title="Só você vê esta aptidão">secreta</span>' : ''}
        <span class="aptacoes">${olho}<button type="button" class="mini" data-apted="${k}">Editar</button></span></div>
      ${!curto && a.d ? `<p class="aptd">${e(a.d)}</p>` : ''}
      ${!curto && tx ? `<p class="apttx"><span class="eyebrow">Nível ${a.nv}</span> ${e(tx)}</p>` : ''}
      <div class="aptlinha">${barra(a)}</div>
      ${A().noTeto(a) ? '' : `<div class="aptmais">
        <button type="button" class="mini" data-aptxp="${k}|1">+1</button><button type="button" class="mini" data-aptxp="${k}|5">+5</button>
        <input type="text" inputmode="numeric" data-aptconta="${k}" placeholder="+15 −4" aria-label="${e('XP para ' + a.n + ': escreva +15, −4 ou +15 −4 e aperte Enter')}" autocomplete="off">
        ${pr ? `<button type="button" class="primary mini aptsobe" data-aptsobe="${k}">▲ Subir de nível</button>` : ''}
      </div>`}
    </div>`;
  }
  function cartaoJogador(a) {
    return `<div class="aptcard"><div class="apttopo"><b class="aptnome">${e(a.n)}</b><span class="aptnv">Nível ${a.nv}</span></div>${a.d ? `<p class="aptd">${e(a.d)}</p>` : ''}</div>`;
  }
  function painel(pc) {
    if (!A() || !usa(pc)) return '';
    const ls = listaDe(pc), M_ = mestra();
    const vazio = M_ ? 'Nenhuma aptidão ainda. Crie uma quando o personagem começar a praticar algo (ex.: Rastreio, Escalada, Pescar).' : 'O mestre ainda não deu nenhuma aptidão a este personagem.';
    return `<div class="panel" id="painelApt" data-aptpc="${e(pc.id)}">
      <div class="hd"><span class="eyebrow">${ICONE} Aptidões</span>
        <span class="hint" style="margin-left:auto">${M_ ? (naMesa() ? 'só você vê a barra e o texto de cada nível' : 'o que o personagem faz melhor com a prática') : 'o que o personagem faz melhor com a prática'}</span>
        ${M_ ? '<button type="button" class="mini primary" data-aptnova>+ Nova aptidão</button>' : ''}</div>
      <div class="bd"><div class="apts">${ls.map(a => (M_ ? cartaoMestre(pc, a) : cartaoJogador(a))).join('') || `<div class="hint">${vazio}</div>`}</div></div>
    </div>`;
  }
  // o quadro da aba Mesa: os personagens de jogador (da campanha em vista) e as aptidões deles
  function quadroMesa() {
    if (!A() || !mestra() || typeof S === 'undefined') return '';
    const camp = naMesa() ? M().campEmVista() : null;
    const pcs = (S.personagens || []).filter(pc => usa(pc) && (naMesa() ? M().deJogador(pc) && !M().encerrada(pc._camp) && (!camp || !pc._camp || pc._camp === camp) : true));
    const blocos = pcs.map(pc => {
      const ls = listaDe(pc), n = A().prontas(ls).length;
      return `<div class="aptpc"><div class="aptpchd"><b>${e(pc.nome || 'Sem nome')}</b>${n ? `<span class="aptpronto">${n === 1 ? '1 pronta para subir' : n + ' prontas para subir'}</span>` : ''}
        <button type="button" class="mini" data-aptnovapc="${e(pc.id)}" style="margin-left:auto">+ Aptidão</button></div>
        <div class="apts curto">${ls.map(a => cartaoMestre(pc, a, true)).join('') || '<div class="hint">Nenhuma aptidão.</div>'}</div></div>`;
    }).join('');
    return `<div class="panel" id="aptMesa" style="margin-top:18px">
      <div class="hd"><span class="eyebrow">${ICONE} Aptidões dos personagens</span><span class="hint" style="margin-left:auto">dê XP a quem praticou · o jogador não vê a barra</span></div>
      <div class="bd">${blocos || '<div class="hint">Nenhum personagem de jogador ainda.</div>'}</div></div>`;
  }

  /* ---------- o editor ---------- */
  function editor(pc, aid) {
    const ex = X(); if (!ex || !A() || !mestra()) return;
    const a = aid ? listaDe(pc).find(x => x.id === aid) : null, P = A().PADRAO, L = A().LIM;
    const v = a || { n: '', d: '', nv: 1, teto: P.teto, xp: 0, max: P.max, tx: {}, oc: false };
    const niveis = t => Array.from({ length: t }, (_, i) => i + 1).map(i => `<label class="f aptnvtx"><span class="eyebrow">Nível ${i}</span><textarea rows="1" data-apttx="${i}" maxlength="${L.texto}" placeholder="O que o nível ${i} dá (ex.: segue um rastro de até ${i} dia${i > 1 ? 's' : ''})">${e((v.tx || {})[i] || '')}</textarea></label>`).join('');
    const { m, fechar } = ex.janela(a ? 'Aptidão de ' + (pc.nome || 'personagem') : 'Nova aptidão para ' + (pc.nome || 'o personagem'), `
      <label class="f"><span class="eyebrow">Nome</span><input data-aptn maxlength="${L.nome}" value="${e(v.n)}" placeholder="ex.: Rastreio" autocomplete="off"></label>
      <label class="f"><span class="eyebrow">Descrição curta (o jogador vê)</span><textarea rows="2" data-aptd maxlength="${L.desc}" placeholder="ex.: Seguir pegadas e sinais de passagem.">${e(v.d)}</textarea></label>
      <div class="aptnums">
        <label class="f"><span class="eyebrow">Nível agora</span><input type="number" min="1" max="${L.teto}" data-aptnv value="${v.nv}"></label>
        <label class="f"><span class="eyebrow">Nível máximo</span><input type="number" min="1" max="${L.teto}" data-aptteto value="${v.teto}"></label>
        <label class="f"><span class="eyebrow">XP para subir</span><input type="number" min="1" max="${L.max}" data-aptmax value="${v.max}"></label>
        <label class="f"><span class="eyebrow">XP na barra</span><input type="number" min="0" data-aptxpv value="${v.xp}"></label>
      </div>
      ${naMesa() ? `<label class="chk" style="display:flex;gap:6px;align-items:center;margin:8px 0"><input type="checkbox" data-aptoc ${v.oc ? 'checked' : ''}> Secreta (o jogador não vê esta aptidão)</label>` : ''}
      <span class="eyebrow" style="display:block;margin-top:10px">O que cada nível dá (só você vê)</span>
      <div data-aptniveis>${niveis(v.teto)}</div>
      <p class="hint itjerro" data-apterro hidden></p>
      <div class="modalacts">${a ? '<button type="button" class="danger" data-apttira>Tirar aptidão</button>' : ''}<span style="margin-left:auto;display:flex;gap:8px"><button type="button" data-jcancela>Cancelar</button><button type="button" class="primary" data-aptok>${a ? 'Salvar' : 'Criar'}</button></span></div>`, 560);
    const nome = q(m, '[data-aptn]'), erro = q(m, '[data-apterro]'), teto = q(m, '[data-aptteto]'), caixa = q(m, '[data-aptniveis]');
    const txs = () => { const o = {}; qa(m, '[data-apttx]').forEach(t => { if (t.value.trim()) o[t.dataset.apttx] = t.value; }); return o; };
    teto.oninput = () => { const t = Math.max(1, Math.min(L.teto, Math.round(+teto.value) || 1)), guardado = Object.assign({}, v.tx, txs()); v.tx = guardado; caixa.innerHTML = niveis(t); };
    nome.focus();
    q(m, '[data-aptok]').onclick = () => {
      const n = nome.value.trim();
      if (!n) { erro.textContent = 'Escreva o nome da aptidão.'; erro.hidden = false; nome.focus(); return; }
      const oc = q(m, '[data-aptoc]');
      const campos = { n, d: q(m, '[data-aptd]').value, nv: +q(m, '[data-aptnv]').value, teto: +teto.value, max: +q(m, '[data-aptmax]').value, xp: +q(m, '[data-aptxpv]').value, tx: txs(), oc: oc ? oc.checked : false };
      fechar();
      if (a) mexer(pc, Object.assign({ t: 'editar', id: a.id }, campos), 'A aptidão ' + n + ' foi salva.');
      else mexer(pc, Object.assign({ t: 'nova', id: novoId() }, campos), 'A aptidão ' + n + ' foi criada para ' + (pc.nome || 'o personagem') + '.');
    };
    const tira = q(m, '[data-apttira]');
    if (tira) tira.onclick = () => {
      if (tira.dataset.certeza !== '1') { tira.dataset.certeza = '1'; tira.textContent = 'Clique de novo para tirar'; return; }
      fechar(); mexer(pc, { t: 'tirar', id: a.id }, 'A aptidão ' + a.n + ' saiu da ficha de ' + (pc.nome || 'o personagem') + '.');
    };
  }

  /* ---------- os cliques ---------- */
  const partes = k => { const i = k.indexOf('|'); return [pcDe(k.slice(0, i)), k.slice(i + 1)]; };
  function ligar(host, pcFicha) {
    if (!host || !mestra()) return;
    const nova = q(host, '[data-aptnova]'); if (nova && pcFicha) nova.onclick = () => editor(pcFicha, null);
    qa(host, '[data-aptnovapc]').forEach(b => b.onclick = () => { const pc = pcDe(b.dataset.aptnovapc); if (pc) editor(pc, null); });
    qa(host, '[data-apted]').forEach(b => b.onclick = () => { const [pc, id] = partes(b.dataset.apted); if (pc) editor(pc, id); });
    qa(host, '[data-aptxp]').forEach(b => b.onclick = () => { const k = b.dataset.aptxp, j = k.lastIndexOf('|'), [pc, id] = partes(k.slice(0, j)); if (pc) mexer(pc, { t: 'xp', id, d: +k.slice(j + 1) }, null, '[data-aptxp="' + k + '"]'); });
    qa(host, '[data-aptsobe]').forEach(b => b.onclick = () => { const [pc, id] = partes(b.dataset.aptsobe); if (pc) mexer(pc, { t: 'subir', id }, 'subiu'); });
    qa(host, '[data-aptolho]').forEach(b => b.onclick = () => {
      const [pc, id] = partes(b.dataset.aptolho), a = pc && listaDe(pc).find(x => x.id === id); if (!a) return;
      const dono = (M().nomeDoDono && M().nomeDoDono(pc)) || 'O jogador';
      mexer(pc, { t: 'oc', id, v: !a.oc }, a.oc ? dono + ' agora vê a aptidão ' + a.n + '.' : 'A aptidão ' + a.n + ' ficou secreta.', '[data-aptolho="' + b.dataset.aptolho + '"]');
    });
    qa(host, '[data-aptconta]').forEach(i => i.onkeydown = ev => {
      if (ev.key !== 'Enter') return;
      ev.preventDefault();
      const d = A().conta(i.value), [pc, id] = partes(i.dataset.aptconta);
      if (d == null) { i.setCustomValidity('Escreva só números com sinal: +15, −4 ou +15 −4.'); i.reportValidity(); return; }
      i.setCustomValidity('');
      if (pc && d) mexer(pc, { t: 'xp', id, d }, null, '[data-aptconta="' + i.dataset.aptconta + '"]');
    });
  }
  // depois de uma mudança: a ficha aberta e o quadro da aba Mesa, sem redesenhar a página
  function repintar(pc, focar) {
    const troca = (el, html, pcF) => {
      if (!el) return;
      const t = document.createElement('div'); t.innerHTML = html; const novo = t.firstElementChild;
      if (!novo) { el.remove(); return; }
      el.replaceWith(novo); ligar(novo, pcF);
      if (focar) { const f = novo.querySelector(focar); if (f) f.focus(); }
    };
    const pf = document.getElementById('painelApt');
    if (pf && pf.dataset.aptpc === pc.id) troca(pf, painel(pc), pc);
    troca(document.getElementById('aptMesa'), quadroMesa(), null);
    const mk = document.querySelector('#abaficha-aptidoes .mk'), n = typeof S !== 'undefined' && S.sel === pc.id ? prontasDe(pc) : null;
    if (n != null) { const b = document.getElementById('abaficha-aptidoes'); if (b) { if (mk) mk.remove(); if (n) b.insertAdjacentHTML('beforeend', '<span class="mk" title="Prontas para subir de nível">▲' + n + '</span>'); } }
  }
  return { painel, ligar, quadroMesa, listaDe, prontasDe, usa, editor };
})();
