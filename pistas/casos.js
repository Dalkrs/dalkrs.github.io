/* Tiny Cats · Pistas (lote 53): os casos de quem joga.
   O caso que o mestre abriu à mesa (escudo:mpub:<id>): as pistas que o grupo já tem e os suspeitos que o mestre mostrou,
   com o que se sabe de cada um e as respostas do interrogatório. No meio, o mural do grupo (mural:<id>): cada pista e
   cada suspeito é um cartão preso na cortiça; o grupo arrasta os cartões, liga com fios o que acha que se conecta e
   cola notas. Tudo o que um faz aparece para os outros (a gravação junta as mudanças de duas pessoas ao mesmo tempo).
   "Acusar…" aponta o culpado; o mestre vê e confirma ou não — nada é automático. window.PistasCasos(kit) → { pintar, ... } */
(() => {
  'use strict';
  window.PistasCasos = function (k) {
    const M = window.TC.misterio, U = window.TC.dom, { h, icone } = U;
    const { toast, J } = k;
    let sel = null, ligando = false, primeiro = null, arrastando = null, pendentePintar = false;
    const LARG = 1300, ALT = 900;

    /* ---------------- o que há ---------------- */
    function casos() {
      const D = k.D();
      if (!D) return [];
      return D.todas().filter(l => !l.apagado && typeof l.id === 'string' && l.id.startsWith(M.PRE.pub) && M.cidDe(l.id))
        .map(l => ({ id: l.id, cid: M.cidDe(l.id), camp: l.id.includes('@') ? l.id.split('@')[1] : null, p: M.normPub(l.dados), rev: l.rev || 1 }))
        .sort((a, b) => String(b.p.em || '').localeCompare(String(a.p.em || '')));
    }
    const idMuralDe = x => M.idMural(x.cid, x.camp);
    function mural(x) { const D = k.D(), l = D && D.pegar(idMuralDe(x)); return l && !l.apagado ? M.normMural(l.dados) : null; }
    function gravarMural(x, fn) {
      const D = k.D(), m0 = mural(x);
      if (!D || !m0) { toast('O mural deste caso ainda não chegou. Tente de novo em um instante.'); return false; }
      const m = JSON.parse(JSON.stringify(m0));
      fn(m);
      D.gravar(idMuralDe(x), { dados: M.normMural(m) }, null, { cas: true });
      return true;
    }
    const eu = () => { const st = k.st(); const m = st && (st.membros || []).find(y => (y.id || y.usuario_id) === st.eu); return (m && m.nome) || 'Alguém do grupo'; };

    /* ---------------- onde fica cada cartão (o que ninguém mexeu ainda: arrumado sozinho) ---------------- */
    function posicoes(x, m) {
      const out = {};
      // (as pistas em duas colunas à esquerda; os suspeitos numa coluna ao lado — tudo à vista numa tela comum)
      x.p.pistas.forEach((p, i) => { const kk = 'p:' + p.id; out[kk] = m.cartas[kk] || { x: 30 + (i % 2) * 230 + Math.floor(i / 8) * 720, y: 30 + (Math.floor(i / 2) % 4) * 200 }; });
      x.p.suspeitos.forEach((s, i) => { const kk = 's:' + s.id; out[kk] = m.cartas[kk] || { x: 520 + Math.floor(i / 5) * 230, y: 30 + (i % 5) * 120 }; });
      for (const id of Object.keys(m.notas)) out['n:' + id] = { x: m.notas[id].x, y: m.notas[id].y };
      return out;
    }
    const inclin = id => { let s = 0; for (const c of id) s = (s * 31 + c.charCodeAt(0)) | 0; return ((Math.abs(s) % 7) - 3) * 0.6; };
    const iniciais = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

    /* ---------------- o mural ---------------- */
    function pintarMural(x, m) {
      const pos = posicoes(x, m), board = h('div', { class: 'mural', 'data-k': 'mural', style: { width: LARG + 'px', height: ALT + 'px' } });
      const fios = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      fios.setAttribute('class', 'fios'); fios.setAttribute('width', LARG); fios.setAttribute('height', ALT); fios.setAttribute('aria-hidden', 'true');
      board.append(fios);
      const cartaoDe = {};
      const carta = (kk, classe, rotulo, ...kids) => {
        const p = pos[kk];
        const el = h('div', { class: 'carta ' + classe + (primeiro === kk ? ' escolhida' : ''), 'data-carta': kk, 'data-k': 'carta:' + kk, tabindex: 0, role: 'group', 'aria-label': rotulo,
          style: { left: p.x + 'px', top: p.y + 'px', transform: 'rotate(' + inclin(kk) + 'deg)' } }, h('span', { class: 'alfinete', 'aria-hidden': 'true' }), ...kids);
        el.addEventListener('pointerdown', ev => comecar(ev, x, kk, el, pos, desenharFios));
        el.addEventListener('click', ev => { if (ligando && !ev.target.closest('button')) escolher(x, kk); });
        el.addEventListener('keydown', ev => { if ((ev.key === 'Enter' || ev.key === ' ') && ligando) { ev.preventDefault(); escolher(x, kk); } });
        cartaoDe[kk] = el; board.append(el); return el;
      };
      for (const p of x.p.pistas) carta('p:' + p.id, 'pista ' + p.jeito, 'Pista: ' + p.txt, h('span', { class: 'jeito', text: M.JEITOS[p.jeito] + (p.de ? ' de ' + p.de : '') }), h('p', { text: p.txt }));
      for (const s of x.p.suspeitos) carta('s:' + s.id, 'suspeito', 'Suspeito: ' + s.nome, h('span', { class: 'foto', 'aria-hidden': 'true', text: iniciais(s.nome) }), h('b', { text: s.nome }), h('small', { text: s.quem }));
      for (const id of Object.keys(m.notas)) {
        const n = m.notas[id];
        carta('n:' + id, 'nota', 'Nota: ' + n.txt, h('p', { text: n.txt }), h('small', { text: n.por }),
          h('button', { type: 'button', class: 'tirar', 'data-k': 'nota:' + id + ':tirar', title: 'Tirar a nota', 'aria-label': 'Tirar a nota', onclick: ev => { ev.stopPropagation(); tirarNota(x, id, n); } }, '×'));
      }
      function desenharFios() {
        while (fios.firstChild) fios.firstChild.remove();
        for (const kk of Object.keys(m.fios)) {
          const [a, b] = kk.split('|'), ea = cartaoDe[a], eb = cartaoDe[b];
          if (!ea || !eb) continue;
          const ax = ea.offsetLeft + ea.offsetWidth / 2, ay = ea.offsetTop + 10, bx = eb.offsetLeft + eb.offsetWidth / 2, by = eb.offsetTop + 10;
          const mx = (ax + bx) / 2, my = (ay + by) / 2 + Math.min(80, Math.hypot(bx - ax, by - ay) * 0.12);
          const pa = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          pa.setAttribute('d', `M${ax} ${ay} Q${mx} ${my} ${bx} ${by}`); pa.setAttribute('class', 'fio'); pa.setAttribute('data-fio', kk);
          fios.append(pa);
        }
      }
      board._fios = desenharFios;
      return board;
    }
    function comecar(ev, x, kk, el, pos, redesenhar) {
      if (ligando || ev.button !== 0 || ev.target.closest('button')) return;
      ev.preventDefault();
      el.setPointerCapture(ev.pointerId);
      const x0 = ev.clientX, y0 = ev.clientY, p0 = { x: pos[kk].x, y: pos[kk].y };
      arrastando = { kk, moveu: false };
      el.classList.add('arrastando');
      const mover = e => {
        const dx = e.clientX - x0, dy = e.clientY - y0;
        if (Math.abs(dx) + Math.abs(dy) > 3) arrastando.moveu = true;
        const nx = Math.max(0, Math.min(LARG - el.offsetWidth, p0.x + dx)), ny = Math.max(0, Math.min(ALT - el.offsetHeight, p0.y + dy));
        el.style.left = nx + 'px'; el.style.top = ny + 'px'; pos[kk] = { x: nx, y: ny }; redesenhar();
      };
      const soltar = () => {
        el.removeEventListener('pointermove', mover); el.removeEventListener('pointerup', soltar); el.removeEventListener('pointercancel', soltar);
        el.classList.remove('arrastando');
        const a = arrastando; arrastando = null;
        if (a && a.moveu) gravarMural(x, m => { const p = { x: Math.round(pos[kk].x), y: Math.round(pos[kk].y) }; if (kk.startsWith('n:')) { const n = m.notas[kk.slice(2)]; if (n) Object.assign(n, p); } else m.cartas[kk] = p; });
        if (pendentePintar) { pendentePintar = false; k.pintar(); }
      };
      el.addEventListener('pointermove', mover); el.addEventListener('pointerup', soltar); el.addEventListener('pointercancel', soltar);
    }
    function escolher(x, kk) {
      if (!primeiro) { primeiro = kk; k.pintar(); return; }
      if (primeiro === kk) { primeiro = null; k.pintar(); return; }
      const a = primeiro; primeiro = null;
      const ch = M.chaveFio(a, kk);
      let tirou = false;
      gravarMural(x, m => { if (m.fios[ch]) { delete m.fios[ch]; tirou = true; } else m.fios[ch] = { por: eu() }; });
      k.pintar();
      toast(tirou ? 'Fio tirado.' : 'Fio ligado: o grupo todo vê.');
    }
    function novaNota(x) {
      const f = h('form', { class: 'nota-f' },
        h('h2', { text: 'Uma nota no mural' }),
        h('textarea', { class: 'in', rows: 3, maxlength: 240, 'data-k': 'nota:txt', placeholder: 'O que vocês acham? Ex.: o ferreiro mente sobre a noite.' }),
        J.pe(h('button', { type: 'button', class: 'btn', 'data-k': 'nota:nao', onclick: () => J.fechar() }, 'Cancelar'), h('button', { type: 'submit', class: 'btn pri', 'data-k': 'nota:ok' }, 'Colar no mural')));
      f.onsubmit = ev => {
        ev.preventDefault();
        const t = M.linha(f.querySelector('textarea').value, 240); if (!t) return;
        const wrap = document.querySelector('.mural-wrap'), id = M.novoId('n');
        const px = wrap ? wrap.scrollLeft + Math.max(20, wrap.clientWidth / 2 - 100) : 60, py = wrap ? wrap.scrollTop + Math.max(20, wrap.clientHeight / 2 - 60) : 60;
        J.fechar();
        if (gravarMural(x, m => { m.notas[id] = { x: Math.round(px), y: Math.round(py), txt: t, por: eu() }; })) { k.pintar(); toast('Nota colada no mural.'); }
      };
      J.abrir('', [f]);
      setTimeout(() => { const a = f.querySelector('textarea'); if (a) a.focus(); }, 30);
    }
    function tirarNota(x, id, n) {
      if (!gravarMural(x, m => { delete m.notas[id]; })) return;
      k.pintar();
      toast('Nota tirada.', 'Desfazer', () => { gravarMural(x, m => { m.notas[id] = n; }); k.pintar(); });
    }
    function acusar(x) {
      if (!x.p.suspeitos.length) { toast('Ainda não há suspeitos à mostra neste caso.'); return; }
      let escolhido = null;
      const f = h('form', { class: 'acusar-f' },
        h('h2', { text: 'Acusar' }),
        h('p', { class: 'ajuda', text: 'Quem vocês acham que foi? O mestre vê a acusação e diz se acertaram.' }),
        h('div', { class: 'acusar-l', role: 'radiogroup', 'aria-label': 'O suspeito' }, x.p.suspeitos.map(s => h('label', { class: 'acusar-o' },
          h('input', { type: 'radio', name: 'quem', value: s.id, 'data-k': 'acusar:' + s.id, onchange: () => { escolhido = s.id; } }), h('span', { class: 'foto', text: iniciais(s.nome) }), h('b', { text: s.nome })))),
        h('textarea', { class: 'in', rows: 3, maxlength: 400, 'data-k': 'acusar:txt', placeholder: 'Por quê? As pistas que provam (opcional).' }),
        J.pe(h('button', { type: 'button', class: 'btn', 'data-k': 'acusar:nao', onclick: () => J.fechar() }, 'Cancelar'), h('button', { type: 'submit', class: 'btn pri', 'data-k': 'acusar:ok' }, 'Acusar')));
      f.onsubmit = ev => {
        ev.preventDefault();
        if (!escolhido) { toast('Escolha um suspeito.'); return; }
        const txt = M.linha(f.querySelector('textarea').value, 400), nome = (x.p.suspeitos.find(s => s.id === escolhido) || {}).nome || '';
        J.fechar();
        if (gravarMural(x, m => { m.acusacao = { sid: escolhido, por: eu(), txt, em: new Date().toISOString() }; })) {
          k.pintar(); toast('Acusação feita: ' + nome + '. Agora é com o mestre.');
          if (window.TC.ponte && TC.ponte.publicar) TC.ponte.publicar('pistas', { titulo: 'Acusação', resumo: eu() + ' acusou ' + nome + ' no caso “' + x.p.titulo + '”.' });
        }
      };
      J.abrir('', [f]);
    }

    /* ---------------- a página ---------------- */
    function pintar() {
      if (arrastando) { pendentePintar = true; return null; }
      const todos = casos();
      if (!todos.length) return h('div', { class: 'vazio' }, h('p', { class: 'tit', text: 'Nenhum caso aberto' }), h('p', { text: 'Quando o mestre abrir um mistério para a mesa, ele aparece aqui, com o mural do grupo.' }));
      if (!sel || !todos.some(x => x.cid === sel)) sel = todos[0].cid;
      const x = todos.find(y => y.cid === sel), m = mural(x) || M.normMural({ cid: x.cid });
      const vd = x.p.veredito, acus = m.acusacao, pend = acus && (!vd || String(vd.em || '') < String(acus.em || ''));
      const nomeS = sid => { const s = x.p.suspeitos.find(y => y.id === sid); return s ? s.nome : 'alguém'; };
      const board = pintarMural(x, m);
      const lado = h('aside', { class: 'caso-lado', 'aria-label': 'Os suspeitos' },
        h('b', { class: 'caso-lado-t', text: 'Suspeitos' }),
        x.p.suspeitos.length ? x.p.suspeitos.map(s => h('div', { class: 'susp', 'data-k': 'susp:' + s.id },
          h('div', { class: 'susp-c' }, h('span', { class: 'foto', 'aria-hidden': 'true', text: iniciais(s.nome) }), h('span', {}, h('b', { text: s.nome }), h('small', { text: s.quem }))),
          s.aparencia ? h('p', { text: s.aparencia }) : null,
          s.respostas.length ? h('div', { class: 'resp' }, h('span', { class: 'resp-t', text: 'No interrogatório' }), h('ul', {}, s.respostas.map(r => h('li', { text: r })))) : null))
          : h('p', { class: 'ajuda', text: 'O mestre ainda não mostrou nenhum suspeito.' }),
        h('div', { class: 'acusar-b' },
          pend ? h('p', { class: 'aviso', 'data-k': 'caso:pendente', text: (acus.por || 'O grupo') + ' acusou ' + nomeS(acus.sid) + '. Esperando o mestre.' }) : null,
          h('button', { type: 'button', class: 'btn pri', 'data-k': 'caso:acusar', onclick: () => acusar(x), disabled: vd && vd.ok ? true : null }, pend ? 'Acusar outra pessoa…' : 'Acusar…')));
      const cab = h('div', { class: 'caso-cab' },
        todos.length > 1 ? h('select', { class: 'in', 'data-k': 'caso:sel', 'aria-label': 'O caso', onchange: ev => { sel = ev.target.value; primeiro = null; k.pintar(); } }, todos.map(y => h('option', { value: y.cid, text: y.p.titulo, selected: y.cid === sel ? true : null }))) : h('h2', { class: 'caso-tit', text: x.p.titulo }),
        h('span', { class: 'ajuda', text: M.TIPOS[x.p.tipo].n + ' · ' + x.p.pistas.length + (x.p.pistas.length === 1 ? ' pista' : ' pistas') }),
        h('span', { class: 'grow' }),
        h('button', { type: 'button', class: 'btn sm' + (ligando ? ' pri' : ''), 'data-k': 'caso:ligar', 'aria-pressed': String(ligando), onclick: () => { ligando = !ligando; primeiro = null; k.pintar(); } }, ligando ? 'Ligando: clique em dois cartões' : 'Ligar com fio'),
        h('button', { type: 'button', class: 'btn sm', 'data-k': 'caso:nota', onclick: () => novaNota(x) }, '+ Nota'));
      const out = h('div', { class: 'caso' }, cab,
        vd ? h('div', { class: 'veredito ' + (vd.ok ? 'ok' : 'nao'), 'data-k': 'caso:veredito' }, h('b', { text: vd.ok ? 'Caso resolvido. ' : 'Ainda não. ' }), vd.txt) : null,
        h('div', { class: 'caso-g' }, h('div', { class: 'mural-wrap' }, board), lado));
      setTimeout(() => board._fios && board._fios(), 0);
      return out;
    }
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && (ligando || primeiro)) { ligando = false; primeiro = null; k.pintar(); } });
    return { pintar, casos, escolher: cid => { sel = cid; }, get sel() { return sel; }, get arrastando() { return !!arrastando; } };
  };
})();
