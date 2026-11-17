/* Tiny Cats · Fichas · as caudas da Kitsune (lote 173).
   Na aba Skills de quem tem a árvore da Kitsune: as caudas que ela tem (o máximo da barra Caudas), cada uma com o
   poder de yokai que guardou. "Guardar poder": quando a Kitsune come um yokai, o mestre ou o jogador escreve o poder (o
   yokai, o nome, o que faz e se ele apodrece a cauda) ou puxa um da biblioteca, e escolhe a cauda. A cauda podre não
   pode ser queimada até o poder ser usado (na barra Caudas, ela fica podre). "Usar": o poder sai e a cauda volta a
   servir. As Cenas mostram o mesmo no painel de barras (TC.painelBarras, a barra "kitsune").
   (lote 174) A biblioteca: todo poder guardado fica lembrado na ficha; a janela junta os de todas as fichas visíveis.
   (lote 176) E fica com o mestre também (fichas:segredos, kitBib): não some se a ficha for apagada.
   A conta é de TC.caudas; o lugar é estado.pb.kitsune.s.caudas. */
const FichasCaudas = (() => {
  'use strict';
  const C = () => window.TC && TC.caudas;
  const M = () => (typeof FichasMesa !== 'undefined' ? FichasMesa : null);
  const X = () => (typeof FichasExtras !== 'undefined' ? FichasExtras : null);
  const q = (el, s) => el.querySelector(s), qa = (el, s) => [...el.querySelectorAll(s)];
  const e = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ARV = 'a_kitsune', REF = 'ba_a_kitsune';
  const SV = (k, t) => (window.TC && TC.simbolos ? TC.simbolos.svg(k, t || 16) : '');

  // (o estado com as caudas e o podre da barra Caudas)
  const tem = pc => !!pc && !pc.petDe && !!(pc.skills && Array.isArray(pc.skills.arvores) && pc.skills.arvores.includes(ARV));
  const mestre = () => !M() || !M().ativo() || M().mestre();
  const pode = pc => !M() || M().podeEditar(pc);
  // quantas caudas ela tem: o máximo da barra Caudas na ficha (1 a 9)
  function quantas(pc) {
    try {
      const c = typeof calcular === 'function' ? calcular(pc) : null, r = c && (c.recursos || []).find(x => x && x.id === REF);
      const m = r ? Math.round(+r.max) : NaN;
      return Number.isFinite(m) ? Math.max(1, Math.min(9, m)) : 9;
    } catch (_) { return 9; }
  }
  const caudasDe = pc => C().daFicha(pc.estado);
  /* (lote 176) A biblioteca do mestre: os poderes de todas as fichas ficam também com o mestre (fichas:segredos, kitBib;
     fora de uma mesa, neste aparelho), e não somem se a ficha for apagada. Quem mestra recolhe os das fichas sempre que
     abre o painel ou guarda um poder. */
  const CHAVE_BIB = 'tc:kitBib';
  const naMesa = () => !!(M() && M().ativo());
  const fichas = () => (typeof S !== 'undefined' ? S.personagens || [] : []);
  function bibDoMestre() {
    if (!C()) return [];
    if (naMesa()) return M().mestre() && S.segredos ? C().normBib(S.segredos.kitBib) : [];
    try { return C().normBib(JSON.parse(localStorage.getItem(CHAVE_BIB) || '[]')); } catch (_) { return []; }
  }
  function porBibDoMestre(lista) {
    const b = C().normBib(lista);
    if (naMesa()) {
      if (!M().mestre()) return;
      const sg = S.segredos && typeof S.segredos === 'object' && !Array.isArray(S.segredos) ? S.segredos : (S.segredos = {});
      if (b.length) sg.kitBib = b; else delete sg.kitBib;
    } else { try { if (b.length) localStorage.setItem(CHAVE_BIB, JSON.stringify(b)); else localStorage.removeItem(CHAVE_BIB); } catch (_) { /* sem espaço */ } }
  }
  // junta na biblioteca do mestre os poderes que as fichas já guardaram → true se mudou (e grava)
  function recolher() {
    if (!C() || !mestre()) return false;
    const antes = bibDoMestre(), novo = C().juntar([antes].concat(fichas().map(x => C().bibDaFicha(x.estado))));
    const ch = l => JSON.stringify(l.map(C().chave).sort());
    if (ch(novo) === ch(antes)) return false;
    porBibDoMestre(novo);
    if (naMesa() && typeof save === 'function') save();
    return true;
  }
  // a biblioteca que a janela mostra: a do mestre (para quem mestra) e a das fichas que a pessoa vê
  const bibToda = () => C().juntar([mestre() ? bibDoMestre() : []].concat(fichas().map(x => C().bibDaFicha(x.estado))));
  function gravar(pc, caudas) { pc.estado = C().naFicha(pc.estado, caudas); if (typeof save === 'function') save(); }
  function mexer(pc, op, aviso) {
    if (!C() || !pode(pc)) return;
    const antes = caudasDe(pc), r = C().mudar(antes, op);
    if (!r.mudou) return;
    gravar(pc, r.caudas);
    if (typeof render === 'function') render(); else repintar(pc);      // (a barra Caudas da ficha mostra a cauda podre)
    const ex = X(); if (!ex) return;
    const msg = typeof aviso === 'function' ? aviso(r) : aviso;
    if (msg) ex.aviso(msg, 'Desfazer', () => { gravar(pc, antes); if (typeof render === 'function') render(); else repintar(pc); });
  }

  function painel(pc) {
    if (!C() || !tem(pc)) return '';
    const n = quantas(pc), cs = caudasDe(pc).slice(0, n), ed = pode(pc), meu = mestre();
    const cartao = (c, i) => `<div class="kcauda${c.p ? ' cheia' : ''}${c.p && c.p.a ? ' ferida' : ''}">
        <div class="kctopo"><span class="kcnum">${SV(c.p ? 'fogo' : 'raposa', 15)} Cauda ${i + 1}</span>
          ${c.p && ed ? `<span class="kcacoes"><button type="button" class="mini primary" data-kusar="${i}">Usar</button><button type="button" class="mini" data-ktirar="${i}" title="Descartar o poder sem usar">Tirar</button></span>` : ''}</div>
        ${c.p ? `<b class="kcpoder">${e(c.p.n || 'Poder')}${c.p.y ? ` <small>de ${e(c.p.y)}</small>` : ''}</b>${c.p.e ? `<p class="kctx">${e(c.p.e)}</p>` : ''}${c.p.a ? `<p class="kcfer">${SV('impacto', 13)} Podre: esta cauda não pode ser queimada até o poder ser usado.</p>` : ''}`
          : '<p class="kctx hint">Vazia.</p>'}
      </div>`;
    return `<div class="panel" id="painelCaudas" data-kpc="${e(pc.id)}">
      <div class="hd"><span class="eyebrow">${SV('raposa', 15)} Caudas da Kitsune</span>
        <span class="hint" style="margin-left:auto">o poder do yokai que ela comeu, guardado numa cauda</span>
        ${ed ? '<button type="button" class="mini primary" data-kguardar>+ Guardar poder</button>' : ''}</div>
      <div class="bd"><div class="kcaudas">${cs.map(cartao).join('')}</div>
        <p class="hint" style="margin:8px 0 0">Usar um poder não queima a cauda. Alguns poderes apodrecem a cauda enquanto estão guardados: ela não pode ser queimada até o poder ser usado.</p></div>
    </div>`;
  }

  function guardar(pc) {
    const ex = X(); if (!ex || !C() || !pode(pc)) return;
    const n = quantas(pc), cs = caudasDe(pc), L = C().LIM;
    const livre = cs.slice(0, n).findIndex(c => !c.p);
    const opc = Array.from({ length: n }, (_, i) => `<option value="${i}"${i === (livre < 0 ? 0 : livre) ? ' selected' : ''}>Cauda ${i + 1}${cs[i].p ? ' (troca ' + e(cs[i].p.n || 'o poder') + ')' : ' (vazia)'}</option>`).join('');
    // (lote 174) a biblioteca: os poderes que as fichas visíveis já guardaram
    recolher();
    const bib = bibToda();
    const linhaBib = (p, k) => `<div class="kbib"><button type="button" class="kbibp" data-kbib="${k}" title="Usar este poder"><b>${e(p.n || 'Poder')}</b>${p.y ? ` <small>de ${e(p.y)}</small>` : ''}${p.a ? ' <small>· apodrece</small>' : ''}${p.e ? `<span>${e(p.e)}</span>` : ''}</button></div>`;
    const { m, fechar } = ex.janela('Guardar o poder de um yokai', `
      <p class="hint" style="margin:0 0 8px">${e(pc.nome || 'A Kitsune')} comeu um yokai: puxe um poder da biblioteca ou escreva um novo, e escolha a cauda. Ele fica até ser usado.</p>
      ${bib.length ? `<span class="eyebrow">Da biblioteca (${bib.length})</span>${bib.length > 6 ? '<input class="inm" data-kbusca placeholder="Procurar (ex.: Kappa)" aria-label="Procurar na biblioteca de poderes" autocomplete="off" style="width:100%;margin:4px 0">' : ''}<div class="kbibl">${bib.map(linhaBib).join('')}</div>` : '<p class="hint" style="margin:0 0 8px">A biblioteca ainda está vazia: o primeiro poder guardado entra nela.</p>'}
      <label class="f"><span class="eyebrow">Cauda</span><select data-kc>${opc}</select></label>
      <label class="f"><span class="eyebrow">Yokai</span><input data-ky maxlength="${L.yokai}" placeholder="ex.: Kappa" autocomplete="off"></label>
      <label class="f"><span class="eyebrow">Nome do poder</span><input data-kn maxlength="${L.nome}" placeholder="ex.: Pele de Água" autocomplete="off"></label>
      <label class="f"><span class="eyebrow">O que faz</span><textarea rows="2" data-ke maxlength="${L.efeito}" placeholder="ex.: Defesa tier II contra fogo por 2 turnos."></textarea></label>
      <label class="chk" style="display:flex;gap:6px;align-items:center;margin:8px 0"><input type="checkbox" data-ka> Apodrece a cauda (ela não pode ser queimada até este poder ser usado)</label>
      <p class="hint itjerro" data-kerro hidden></p>
      <div class="modalacts"><span style="margin-left:auto;display:flex;gap:8px"><button type="button" data-jcancela>Cancelar</button><button type="button" class="primary" data-kok>Guardar</button></span></div>`, 520);
    q(m, '[data-ky]').focus();
    qa(m, '[data-kbib]').forEach(b => b.onclick = () => { const p = bib[+b.dataset.kbib]; if (!p) return; q(m, '[data-ky]').value = p.y; q(m, '[data-kn]').value = p.n; q(m, '[data-ke]').value = p.e; q(m, '[data-ka]').checked = !!p.a; qa(m, '[data-kbib]').forEach(x => x.classList.toggle('on', x === b)); });
    const busca = q(m, '[data-kbusca]');
    if (busca) busca.oninput = () => { const t = busca.value.trim().toLowerCase(); qa(m, '.kbib').forEach(l => { l.hidden = !!t && !l.textContent.toLowerCase().includes(t); }); };
    q(m, '[data-kok]').onclick = () => {
      const p = { y: q(m, '[data-ky]').value, n: q(m, '[data-kn]').value, e: q(m, '[data-ke]').value, a: q(m, '[data-ka]').checked }, i = +q(m, '[data-kc]').value;
      if (!p.n.trim() && !p.e.trim()) { const er = q(m, '[data-kerro]'); er.textContent = 'Escreva o nome do poder ou o que ele faz.'; er.hidden = false; return; }
      fechar();
      mexer(pc, { t: 'guardar', i, p }, 'O poder ' + (p.n.trim() || 'do yokai') + ' ficou na cauda ' + (i + 1) + '.');
      recolher();
    };
  }

  function ligar(host, pc) {
    if (!host || !tem(pc) || !pode(pc)) return;
    const b = q(host, '[data-kguardar]'); if (b) b.onclick = () => guardar(pc);
    if (mestre()) setTimeout(recolher, 0);
    qa(host, '[data-kusar]').forEach(x => x.onclick = () => {
      const i = +x.dataset.kusar;
      mexer(pc, { t: 'usar', i }, r => C().textoUso(pc.nome, i, r.usado));
    });
    qa(host, '[data-ktirar]').forEach(x => x.onclick = () => { const i = +x.dataset.ktirar; mexer(pc, { t: 'tirar', i }, 'O poder saiu da cauda ' + (i + 1) + ' sem ser usado.'); });
  }
  function repintar(pc) {
    const el = document.getElementById('painelCaudas');
    if (!el || el.dataset.kpc !== pc.id) return;
    const t = document.createElement('div'); t.innerHTML = painel(pc);
    const novo = t.firstElementChild; if (!novo) { el.remove(); return; }
    el.replaceWith(novo); ligar(novo, pc);
  }
  return { tem, painel, ligar, guardar, bibDoMestre, recolher };
})();
