/* =======================================================================
   TC.calendario — o calendário do mundo (lote 56): a data de hoje do RPG, o nascimento, a idade e a janela de escolher
   uma data, com os meses e os anos do mundo (os do Mapa-múndi).

     doMundo(lista, { pegar, mestre }) → { meses: [{ nome, dias }], hoje: { a, m, d } | null, mapa: o nome | null }
        Sempre o mapa principal: o mapa de onde o Jornal tira a data (o publicado; para quem mestra, também o rascunho),
        senão o primeiro mapa, por nome; sem mapas, o calendário de começo (12 meses de 30 dias) sem o dia de hoje.
        lista: os documentos da mesa ({ id, dados, apagado }), pegar(id): um documento.
     normNasc(v, meses) → { d, m, a? } | null   (o dia preso ao tamanho do mês; o ano é opcional)
     idade(nasc, hoje, meses) → os anos completos (null sem o ano ou sem o dia de hoje)
     texto(nasc, meses) → "3 de Brumas, ano 412"
     escolher({ meses, hoje, valor, titulo }) → Promise: { d, m, a } (escolheu), null (limpou) ou undefined (desistiu)

   Roda no Node (as contas) e no navegador (window.TC.calendario, com a janela).
   ======================================================================= */
(function (root) {
  'use strict';
  const MESES_PADRAO = ['Alvorada', 'Degelo', 'Semeadura', 'Florada', 'Verdor', 'Solar', 'Colheita', 'Âmbar', 'Brumas', 'Geada', 'Vigília', 'Noite Longa'].map(nome => ({ nome, dias: 30 }));
  const ehObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const num = v => { const n = Number(v); return v !== null && v !== '' && typeof v !== 'boolean' && Number.isFinite(n) ? n : null; };

  function mesesDe(cal) {
    const l = ehObj(cal) && Array.isArray(cal.meses) && cal.meses.length ? cal.meses : MESES_PADRAO;
    return l.slice(0, 99).map((x, i) => ({ nome: String((x && x.nome) || 'Mês ' + (i + 1)).slice(0, 40), dias: Math.max(1, Math.min(99, Math.round(num(x && x.dias) || 30))) }));
  }
  // o dia de hoje de um calendário do Mapa-múndi (cal.dia: os dias desde o começo; cal.ano0: o ano do primeiro dia)
  function hojeDe(cal, meses) {
    const total = meses.reduce((s, x) => s + x.dias, 0), dia = Math.max(0, Math.floor(num(cal.dia) || 0)), ano0 = num(cal.ano0) != null ? Math.round(num(cal.ano0)) : 1;
    let r = dia % total, m = 0;
    while (m < meses.length - 1 && r >= meses[m].dias) { r -= meses[m].dias; m++; }
    return { a: ano0 + Math.floor(dia / total), m, d: r + 1 };
  }
  function doMundo(lista, op) {
    op = op || {};
    const padrao = { meses: MESES_PADRAO.map(x => Object.assign({}, x)), hoje: null, mapa: null };
    const mapas = [];
    for (const l of Array.isArray(lista) ? lista : []) {
      if (!l || l.apagado || typeof l.id !== 'string' || !ehObj(l.dados)) continue;
      const pub = l.id.startsWith('mundo:pub:');
      if (!pub && !l.id.startsWith('mundo:mapa:')) continue;
      const d = l.dados, id = typeof d.id === 'string' && d.id ? d.id : l.id.slice(pub ? 10 : 11);
      if (!ehObj(d.cal) || !id) continue;
      const x = { id, nome: String(d.nome || 'Mapa'), cal: d.cal, pub }, i = mapas.findIndex(y => y.id === id);
      if (i < 0) mapas.push(x); else if (mapas[i].pub && !pub) mapas[i] = x;          // (o mapa vale mais que a projeção dele)
    }
    if (!mapas.length) return padrao;
    const pegar = typeof op.pegar === 'function' ? op.pegar : () => null;
    const jr = id => { const d = pegar(id); return d && !d.apagado && ehObj(d.dados) && typeof d.dados.mapa === 'string' ? d.dados.mapa : null; };
    const m = mapas.find(x => x.id === jr('jornal:pub')) || (op.mestre ? mapas.find(x => x.id === jr('jornal:rascunho')) : null)
      || mapas.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))[0];
    const meses = mesesDe(m.cal);
    return { meses, hoje: hojeDe(m.cal, meses), mapa: m.nome };
  }
  function normNasc(v, meses) {
    if (!ehObj(v)) return null;
    const ms = Array.isArray(meses) && meses.length ? meses : null, m = num(v.m), d = num(v.d);
    if (m == null || d == null) return null;
    const mi = Math.round(m);
    if (mi < 0 || mi > 98 || (ms && mi >= ms.length)) return null;
    const lim = ms ? ms[mi].dias : 99, di = Math.round(d);
    if (di < 1 || di > lim) return null;
    const o = { d: di, m: mi }, a = num(v.a);
    if (a != null && Math.abs(a) <= 1e6) o.a = Math.round(a);
    return o;
  }
  function idade(nasc, hoje, meses) {
    const n = normNasc(nasc, meses);
    if (!n || n.a == null || !ehObj(hoje) || num(hoje.a) == null) return null;
    const antes = (num(hoje.m) || 0) < n.m || ((num(hoje.m) || 0) === n.m && (num(hoje.d) || 1) < n.d);
    return Math.round(hoje.a) - n.a - (antes ? 1 : 0);
  }
  function texto(nasc, meses) {
    const n = normNasc(nasc, meses), ms = Array.isArray(meses) && meses.length ? meses : MESES_PADRAO;
    if (!n) return '';
    return n.d + ' de ' + ((ms[n.m] && ms[n.m].nome) || 'Mês ' + (n.m + 1)) + (n.a != null ? ', ano ' + n.a : '');
  }
  const anos = n => (n === 1 ? '1 ano' : n + ' anos');

  /* ---------------- a janela (só no navegador) ----------------
     O almanaque: o nome do mês grande, com a fita dos meses do ano embaixo (cada mês um tracinho; o de agora aceso e o
     de hoje marcado), o ano com as setas, os dias em grade (o de hoje com o anel, o escolhido aceso) e, embaixo, a
     data em palavras e a idade que ela dá hoje. Esc e Cancelar desistem; Limpar tira a data. */
  const CSS = `
.tcc-fundo{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:16px;background:rgba(6,8,12,.62);margin:0;border:0;width:100vw;height:100vh;max-width:none;max-height:none;box-sizing:border-box;color:inherit}
.tcc-fundo::backdrop{background:transparent}
.tcc{--c-bg:var(--raised,var(--panel,#1f2431));--c-fg:var(--fg,var(--ink,#e8eaf0));--c-fg2:var(--fg-2,var(--muted,#a6aec0));--c-line:var(--line,#2b3243);--c-acc:var(--lamp,var(--accent,#e6ab4f));--c-on:var(--on-lamp,#1d1503);
  width:min(380px,100%);max-height:calc(100vh - 32px);overflow:auto;background:var(--c-bg);color:var(--c-fg);border:1px solid var(--c-line);border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.55);padding:16px 16px 14px;font:14px/1.4 var(--ui,system-ui,sans-serif)}
.tcc h2{margin:0 0 2px;font:600 13px/1.3 var(--ui,system-ui,sans-serif);color:var(--c-fg2)}
.tcc-mes{display:grid;grid-template-columns:34px 1fr 34px;align-items:center;gap:6px;margin-top:4px}
.tcc-mes b{font:600 30px/1.05 var(--display,Georgia,serif);text-align:center;letter-spacing:.01em;overflow-wrap:anywhere}
.tcc button{font:inherit;color:inherit;cursor:pointer}
.tcc-seta{width:34px;height:34px;border-radius:9px;border:1px solid var(--c-line);background:transparent;font-size:18px!important;line-height:1}
.tcc-seta:hover,.tcc-dia:hover{border-color:var(--c-acc)}
.tcc-fita{display:flex;gap:3px;margin:10px 2px 12px}
.tcc-fita button{flex:1;min-width:0;height:9px;padding:0;border-radius:3px;border:0;background:var(--c-line)}
.tcc-fita button.agora{background:var(--c-acc)}
.tcc-fita button.hoje{box-shadow:inset 0 0 0 2px var(--c-fg2)}
.tcc-ano{display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:10px;color:var(--c-fg2)}
.tcc-ano input{width:86px;min-height:32px;text-align:center;border-radius:8px;border:1px solid var(--c-line);background:transparent;color:var(--c-fg);font:inherit}
.tcc-ano .tcc-seta{width:30px;height:30px}
.tcc-sem{display:flex;align-items:center;gap:6px;justify-content:center;margin:-4px 0 10px;color:var(--c-fg2);font-size:13px}
.tcc-dias{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.tcc-dia{aspect-ratio:1;min-height:34px;border-radius:9px;border:1px solid transparent;background:transparent;font-variant-numeric:tabular-nums}
.tcc-dia.hoje{border-color:var(--c-fg2)}
.tcc-dia.on{background:var(--c-acc);color:var(--c-on);font-weight:700;border-color:var(--c-acc)}
.tcc-dia:focus-visible,.tcc-seta:focus-visible,.tcc-fita button:focus-visible,.tcc-pe button:focus-visible,.tcc-ano input:focus-visible{outline:2px solid var(--c-acc);outline-offset:2px}
.tcc-diz{margin:12px 0 0;min-height:20px;text-align:center;color:var(--c-fg2)}
.tcc-diz b{color:var(--c-fg)}
.tcc-pe{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:12px}
.tcc-pe button{min-height:34px;padding:0 12px;border-radius:8px;border:1px solid var(--c-line);background:transparent}
.tcc-pe .tcc-ok{background:var(--c-acc);border-color:var(--c-acc);color:var(--c-on);font-weight:700}
.tcc-pe .tcc-limpa{margin-right:auto}
@media (prefers-reduced-motion:no-preference){.tcc{animation:tcc-abre .14s ease-out}@keyframes tcc-abre{from{transform:translateY(6px);opacity:.4}to{transform:none;opacity:1}}}`;
  function estilo(doc) {
    if (doc.getElementById('tcc-estilo')) return;
    const st = doc.createElement('style'); st.id = 'tcc-estilo'; st.textContent = CSS; doc.head.appendChild(st);
  }
  function escolher(op) {
    op = op || {};
    const doc = root.document;
    if (!doc) return Promise.resolve(undefined);
    estilo(doc);
    const meses = Array.isArray(op.meses) && op.meses.length ? op.meses : MESES_PADRAO, hoje = ehObj(op.hoje) ? op.hoje : null;
    const v0 = normNasc(op.valor, meses);
    const st = { m: v0 ? v0.m : hoje ? hoje.m : 0, d: v0 ? v0.d : null, a: v0 ? (v0.a != null ? v0.a : null) : hoje ? hoje.a : null };
    const antesFoco = doc.activeElement;
    return new Promise(resolve => {
      // (um <dialog> modal: fica por cima de outra janela modal aberta — a do membro, a do soldado)
      const fundo = doc.createElement(typeof HTMLDialogElement === 'function' ? 'dialog' : 'div'); fundo.className = 'tcc-fundo';
      const caixa = doc.createElement('div'); caixa.className = 'tcc'; caixa.setAttribute('role', 'dialog'); caixa.setAttribute('aria-modal', 'true');
      const titulo = op.titulo || 'Escolher a data'; caixa.setAttribute('aria-label', titulo);
      fundo.appendChild(caixa); doc.body.appendChild(fundo);
      if (fundo.showModal) { try { fundo.showModal(); } catch (e) { /* (sem o modo modal: fica como camada comum) */ } fundo.addEventListener('cancel', e => { e.preventDefault(); fim(undefined); }); }
      const fim = r => { doc.removeEventListener('keydown', tecla, true); try { if (fundo.close && fundo.open) fundo.close(); } catch (e) { /* já fechado */ } fundo.remove(); try { if (antesFoco && antesFoco.focus) antesFoco.focus(); } catch (e) { /* (o botão de antes saiu da página) */ } resolve(r); };
      const tecla = e => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fim(undefined); return; }
        if (e.key === 'Tab') { const fs = [...caixa.querySelectorAll('button,input')].filter(x => !x.disabled); if (!fs.length) return; const i = fs.indexOf(doc.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); fs[fs.length - 1].focus(); } else if (!e.shiftKey && i === fs.length - 1) { e.preventDefault(); fs[0].focus(); } }
      };
      doc.addEventListener('keydown', tecla, true);
      fundo.addEventListener('mousedown', e => { if (e.target === fundo) fim(undefined); });
      const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      function desenhar(foco) {
        const mes = meses[st.m], dias = mes.dias;
        if (st.d != null && st.d > dias) st.d = dias;
        const escolhida = st.d != null ? { d: st.d, m: st.m, a: st.a == null ? undefined : st.a } : null;
        const id = escolhida && hoje ? idade(escolhida, hoje, meses) : null;
        const ehHoje = n => hoje && hoje.m === st.m && hoje.d === n && (st.a == null || st.a === hoje.a);
        caixa.innerHTML = `<h2>${esc(titulo)}</h2>
          <div class="tcc-mes"><button type="button" class="tcc-seta" data-c="mes-" aria-label="Mês anterior">‹</button><b aria-live="polite">${esc(mes.nome)}</b><button type="button" class="tcc-seta" data-c="mes+" aria-label="Próximo mês">›</button></div>
          <div class="tcc-fita" role="group" aria-label="Os meses do ano">${meses.map((x, i) => `<button type="button" data-c="ir" data-m="${i}" class="${i === st.m ? 'agora' : ''}${hoje && hoje.m === i ? ' hoje' : ''}" title="${esc(x.nome)}" aria-label="${esc(x.nome)}"${i === st.m ? ' aria-current="true"' : ''}></button>`).join('')}</div>
          <div class="tcc-ano"><button type="button" class="tcc-seta" data-c="ano-" aria-label="Ano anterior" ${st.a == null ? 'disabled' : ''}>−</button><label>ano <input type="number" step="1" data-c="ano" value="${st.a == null ? '' : st.a}" placeholder="sem ano" aria-label="Ano"></label><button type="button" class="tcc-seta" data-c="ano+" aria-label="Próximo ano" ${st.a == null ? 'disabled' : ''}>+</button></div>
          <div class="tcc-dias" role="group" aria-label="Os dias de ${esc(mes.nome)}">${Array.from({ length: dias }, (_, i) => i + 1).map(n => `<button type="button" class="tcc-dia${st.d === n ? ' on' : ''}${ehHoje(n) ? ' hoje' : ''}" data-c="dia" data-d="${n}" aria-pressed="${st.d === n}" aria-label="${n} de ${esc(mes.nome)}${ehHoje(n) ? ' (hoje)' : ''}">${n}</button>`).join('')}</div>
          <p class="tcc-diz">${escolhida ? '<b>' + esc(texto(escolhida, meses)) + '</b>' + (id != null && id >= 0 ? ' · ' + anos(id) + ' hoje' : st.a == null ? ' · sem o ano, sem a idade' : '') : 'Escolha o dia.'}</p>
          <div class="tcc-pe">${op.valor ? '<button type="button" class="tcc-limpa" data-c="limpar">Limpar</button>' : ''}${hoje ? '<button type="button" data-c="hoje">Hoje</button>' : ''}<button type="button" data-c="cancelar">Cancelar</button><button type="button" class="tcc-ok" data-c="ok" ${escolhida ? '' : 'disabled'}>Escolher</button></div>`;
        const alvo = foco ? caixa.querySelector(foco) : null;
        (alvo || caixa.querySelector('.tcc-dia.on') || caixa.querySelector('.tcc-dia')).focus();
      }
      caixa.addEventListener('click', e => {
        const b = e.target.closest('[data-c]');
        if (!b || b.disabled) return;
        const c = b.dataset.c;
        if (c === 'mes-' || c === 'mes+') {
          const pra = c === 'mes+' ? 1 : -1;
          st.m += pra;
          if (st.m < 0) { st.m = meses.length - 1; if (st.a != null) st.a--; }
          if (st.m >= meses.length) { st.m = 0; if (st.a != null) st.a++; }
          desenhar('[data-c="' + c + '"]');
        } else if (c === 'ir') { st.m = +b.dataset.m; desenhar('[data-c="ir"][data-m="' + st.m + '"]'); }
        else if (c === 'ano-' || c === 'ano+') { st.a += c === 'ano+' ? 1 : -1; desenhar('[data-c="' + c + '"]'); }
        else if (c === 'dia') { st.d = +b.dataset.d; desenhar('.tcc-dia.on'); }
        else if (c === 'hoje' && hoje) { st.m = hoje.m; st.d = hoje.d; st.a = hoje.a; desenhar('.tcc-dia.on'); }
        else if (c === 'limpar') fim(null);
        else if (c === 'cancelar') fim(undefined);
        else if (c === 'ok' && st.d != null) fim(normNasc({ d: st.d, m: st.m, a: st.a }, meses));
      });
      caixa.addEventListener('change', e => { if (e.target.dataset.c === 'ano') { const n = num(e.target.value); st.a = n == null ? null : Math.round(n); desenhar('[data-c="ano"]'); } });
      caixa.addEventListener('dblclick', e => { const b = e.target.closest('.tcc-dia'); if (b) { st.d = +b.dataset.d; fim(normNasc({ d: st.d, m: st.m, a: st.a }, meses)); } });
      caixa.addEventListener('keydown', e => {
        const b = e.target.closest('.tcc-dia');
        if (!b) return;
        const n = +b.dataset.d, dias = meses[st.m].dias, pulo = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 }[e.key];
        if (!pulo) return;
        e.preventDefault();
        const alvo = Math.max(1, Math.min(dias, n + pulo)), x = caixa.querySelector('.tcc-dia[data-d="' + alvo + '"]');
        if (x) x.focus();
      });
      desenhar();
    });
  }

  const api = { MESES_PADRAO, mesesDe, hojeDe, doMundo, normNasc, idade, texto, anos, escolher };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { window.TC = window.TC || {}; window.TC.calendario = api; }
})(typeof window !== 'undefined' ? window : this);
