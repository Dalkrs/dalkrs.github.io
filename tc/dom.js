/* Tiny Cats · o miúdo das páginas novas (lote 31: o Escudo do mestre e as Pistas): montar elementos, pintar por cima sem
   tirar o campo em que se escreve do lugar (morph), os avisos de baixo (com Desfazer) e as janelas (dialog). */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  /* h('button', { class: 'btn', onclick, 'data-k': 'x' }, 'texto', outroElemento): texto sempre entra como texto. */
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
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c);
    if (valor !== undefined) el.value = valor;
    return el;
  }
  // um desenho 24×24 de traço (só desenhos fixos, deste site)
  function svg(tam, conteudo, larg, caixa) {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('width', tam); s.setAttribute('height', tam); s.setAttribute('viewBox', caixa || '0 0 24 24');
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', larg || '1.8');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = conteudo;
    return s;
  }
  const icone = (d, tam, larg) => svg(tam || 18, '<path d="' + d + '"/>', larg);
  const trocar = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter(c => c != null && c !== false));

  /* ---- pintar por cima ---- */
  const PROPS = ['onclick', 'onchange', 'oninput', 'onsubmit', 'onkeydown', 'onkeyup', 'onblur', 'onfocus', 'onpointerdown', 'onpointermove', 'onpointerup', 'ondragstart', 'ondragend', 'ondragover', 'ondragleave', 'ondrop', 'oncontextmenu'];
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

  /* ---- os avisos de baixo ---- */
  function avisos(caixa) {
    return function toast(texto, acaoTxt, fn, ms) {
      while (caixa.children.length >= 3) caixa.firstElementChild.remove();
      const t = h('div', { class: 'toast', role: 'status' }, h('span', { text: texto }));
      if (acaoTxt) t.append(h('button', { type: 'button', text: acaoTxt, onclick: () => { t.remove(); fn(); } }));
      caixa.append(t);
      let rel = setTimeout(() => t.remove(), ms || (acaoTxt ? 9000 : 4500));
      t.addEventListener('pointerenter', () => clearTimeout(rel));
      t.addEventListener('pointerleave', () => { clearTimeout(rel); rel = setTimeout(() => t.remove(), 2500); });
      return t;
    };
  }

  /* ---- as janelas ---- */
  function janelas(dlg) {
    let aoFechar = null;
    dlg.addEventListener('close', () => { const f = aoFechar; aoFechar = null; if (f) f(); });
    const api = {
      abrir(classe, filhos, fechou) {
        dlg.className = 'dl' + (classe ? ' ' + classe : '');
        trocar(dlg, filhos);
        aoFechar = fechou || null;
        if (!dlg.open) dlg.showModal();
      },
      fechar() { aoFechar = null; if (dlg.open) dlg.close(); },
      aberta: () => dlg.open,
      pe: (...b) => h('div', { class: 'pe' }, b),
      confirmar(titulo, texto, ok, perigo) {
        return new Promise(resolve => {
          let feito = false;
          const fim = v => { if (feito) return; feito = true; api.fechar(); resolve(v); };
          api.abrir('', [h('h2', { text: titulo }), texto ? h('p', { text: texto }) : null, api.pe(h('button', { type: 'button', class: 'btn', 'data-k': 'dl:nao', onclick: () => fim(false) }, 'Cancelar'),
            h('button', { type: 'button', class: 'btn ' + (perigo ? 'per' : 'pri'), 'data-k': 'dl:sim', onclick: () => fim(true) }, ok || 'OK'))], () => fim(false));
          dlg.querySelector('[data-k="dl:sim"]').focus();
        });
      },
      pedirTexto(titulo, rotulo, valor, ok, max) {
        return new Promise(resolve => {
          let feito = false;
          const fim = v => { if (feito) return; feito = true; api.fechar(); resolve(v); };
          const inp = h('input', { class: 'in', 'data-k': 'dl:txt', value: valor || '', maxlength: max || 80, 'aria-label': rotulo });
          const f = h('form', { onsubmit: ev => { ev.preventDefault(); const v = inp.value.trim(); if (v) fim(v); } },
            h('h2', { text: titulo }), h('label', { class: 'field' }, h('span', { text: rotulo }), inp),
            api.pe(h('button', { type: 'button', class: 'btn', 'data-k': 'dl:nao', onclick: () => fim(null) }, 'Cancelar'), h('button', { type: 'submit', class: 'btn pri', 'data-k': 'dl:sim' }, ok || 'OK')));
          api.abrir('', [f], () => fim(null));
          inp.focus(); inp.select();
        });
      },
    };
    return api;
  }

  const hora = iso => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
  const dataHora = iso => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + hora(iso); };
  const guarda = {
    ler(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    gravar(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  };
  window.TC = window.TC || {};
  window.TC.dom = { NS, h, svg, icone, trocar, morphEm, avisos, janelas, hora, dataHora, guarda };
})();
