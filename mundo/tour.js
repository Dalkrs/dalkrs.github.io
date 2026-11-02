/* Tiny Cats · Mapa-múndi · a apresentação (lote 63).
   Na primeira vez que quem mestra abre o Mapa-múndi com os modos de trabalho, seis passos mostram onde fica cada coisa:
   os modos, o trilho, as abas, o botão direito no mapa, a lupa e a data. Cada passo acende um lugar da tela (o resto
   escurece) e diz, em uma ou duas frases, para que ele serve. Dá para voltar, pular (Esc) e rever pelo botão "?" do alto.
   Fica lembrado neste aparelho (tinycats:mundo:tour63). Nada muda no mapa. */
(() => {
  'use strict';
  const CHAVE = 'tinycats:mundo:tour63';
  const PASSOS = [
    { sel: '#modos', t: 'Os modos de trabalho', txt: 'Escolha aqui o que vai fazer agora: Sessão, Guerra, Política ou Preparar. Cada modo mostra só as ferramentas e as abas dele. Alt+1 a Alt+4 também trocam.' },
    { sel: '#rail', t: 'As ferramentas do modo', txt: 'Cada uma com o nome e a tecla. Apertar a tecla de uma ferramenta de outro modo leva você até ele.' },
    { sel: '#tabs', t: 'O painel', txt: 'As abas do modo. Seleção mostra o que você escolheu no mapa e aparece em todos os modos.' },
    { sel: '#palco', t: 'O mapa', txt: 'Botão direito no mapa: marcador, grupo, evento ou Novo exército aqui. Arraste o fundo para andar.' },
    { sel: '.zoom', t: 'A lupa', txt: 'Aproxime para ver o terreno de perto. A grade aparece sozinha quando os hexágonos ficam grandes, e nunca no mar.' },
    { sel: '.cal', t: 'A data do mundo', txt: 'O dia de hoje e o +1 tempo: os grupos andam e os eventos mudam com ele.' },
  ];
  const ler = () => { try { return localStorage.getItem(CHAVE); } catch (e) { return null; } };
  const gravar = () => { try { localStorage.setItem(CHAVE, 'visto'); } catch (e) { /* sem armazenamento */ } };
  let el = null, i = 0, aoMudar = null;

  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const k in attrs || {}) { const v = attrs[k]; if (v == null || v === false) continue; if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v === true ? '' : v); }
    for (const c of kids.flat()) if (c != null && c !== false) e.append(c);
    return e;
  }
  function fechar(visto) {
    if (!el) return;
    el.remove(); el = null;
    window.removeEventListener('resize', aoMudar); document.removeEventListener('keydown', tecla, true);
    if (visto) gravar();
  }
  function tecla(e) {
    if (!el) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar(true); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); ir(i + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); ir(i - 1); }
  }
  function ir(n) {
    if (!el) return;
    if (n >= PASSOS.length) { fechar(true); return; }
    i = Math.max(0, n);
    const p = PASSOS[i], alvo = document.querySelector(p.sel), anel = el.querySelector('.tour-anel'), card = el.querySelector('.tour-card');
    const r = alvo && alvo.offsetParent !== null ? alvo.getBoundingClientRect() : null;
    if (r && r.width && r.height) {
      Object.assign(anel.style, { left: (r.left - 6) + 'px', top: (r.top - 6) + 'px', width: (r.width + 12) + 'px', height: (r.height + 12) + 'px' });
      anel.hidden = false;
    } else anel.hidden = true;
    card.querySelector('.tour-n').textContent = 'Passo ' + (i + 1) + ' de ' + PASSOS.length;
    card.querySelector('h2').textContent = p.t;
    card.querySelector('.tour-txt').textContent = p.txt;
    card.querySelector('[data-k="tour:volta"]').disabled = i === 0;
    card.querySelector('[data-k="tour:prox"]').textContent = i === PASSOS.length - 1 ? 'Começar' : 'Próximo';
    // o cartão ao lado do lugar aceso (embaixo, se cabe; senão em cima; o palco grande: no meio dele)
    const W = window.innerWidth, H = window.innerHeight, cw = Math.min(340, W - 24);
    card.style.width = cw + 'px';
    const ch = card.offsetHeight || 170;
    let x = 12, y = 12;
    if (r) {
      const grande = r.width > W * 0.5 && r.height > H * 0.5;
      if (grande) { x = r.left + r.width / 2 - cw / 2; y = r.top + r.height / 2 - ch / 2; }
      else if (r.bottom + 14 + ch < H) { x = r.left; y = r.bottom + 14; }
      else if (r.top - 14 - ch > 0) { x = r.left; y = r.top - 14 - ch; }
      else { x = r.right + 14; y = r.top; }
      if (r.left > W * 0.6 && !grande) x = r.right - cw;                  // (o painel da direita: o cartão alinha pela direita)
    }
    card.style.left = Math.max(12, Math.min(W - cw - 12, x)) + 'px';
    card.style.top = Math.max(12, Math.min(H - ch - 12, y)) + 'px';
    card.querySelector('[data-k="tour:prox"]').focus();
  }
  function abrir() {
    fechar(false);
    el = h('div', { class: 'tour', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'tourTit', 'data-k': 'tour' },
      h('div', { class: 'tour-anel', 'aria-hidden': 'true' }),
      h('div', { class: 'tour-card' },
        h('span', { class: 'tour-n' }), h('h2', { id: 'tourTit' }), h('p', { class: 'tour-txt' }),
        h('div', { class: 'tour-pe' },
          h('button', { type: 'button', class: 'btn sm', 'data-k': 'tour:pular', onclick: () => fechar(true), text: 'Pular' }),
          h('span', { class: 'grow' }),
          h('button', { type: 'button', class: 'btn sm', 'data-k': 'tour:volta', onclick: () => ir(i - 1), text: 'Voltar' }),
          h('button', { type: 'button', class: 'btn sm pri', 'data-k': 'tour:prox', onclick: () => ir(i + 1), text: 'Próximo' }))));
    document.body.append(el);
    aoMudar = () => ir(i);
    window.addEventListener('resize', aoMudar);
    document.addEventListener('keydown', tecla, true);
    ir(0);
  }
  // na primeira vez (quem mestra, com os modos à vista)
  function talvez(App) {
    if (ler() || el || !App || !App.comModos || !App.comModos() || !App.mapa) return;
    const m = document.getElementById('modos');
    if (!m || m.hidden) return;
    setTimeout(() => { if (!ler() && !el && App.comModos()) abrir(); }, 600);
  }
  window.MundoTour = { abrir, talvez, fechar, aberto: () => !!el, PASSOS };
})();
