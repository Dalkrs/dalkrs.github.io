/* Tiny Cats · Fichas · as caudas da Kitsune (lote 173).
   Na aba Skills de quem tem a árvore da Kitsune: as caudas que ela tem (o máximo da barra Caudas), cada uma com o
   poder de yokai que guardou e as feridas que ficaram. "Guardar poder": quando a Kitsune come um yokai, o mestre ou o
   jogador escreve o poder (o yokai, o nome, o que faz e, se for o caso, a ferida que ele deixa ao ser usado) e escolhe a
   cauda. "Usar": o poder sai (a cauda não queima); se ele deixava ferida, a ferida fica escrita na cauda até o mestre
   tirar. As Cenas mostram o mesmo no painel de barras (TC.painelBarras, a barra "kitsune").
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
  function gravar(pc, caudas) { pc.estado = C().naFicha(pc.estado, caudas); if (typeof save === 'function') save(); }
  function mexer(pc, op, aviso) {
    if (!C() || !pode(pc)) return;
    const antes = caudasDe(pc), r = C().mudar(antes, op);
    if (!r.mudou) return;
    gravar(pc, r.caudas);
    repintar(pc);
    const ex = X(); if (!ex) return;
    const msg = typeof aviso === 'function' ? aviso(r) : aviso;
    if (msg) ex.aviso(msg, 'Desfazer', () => { gravar(pc, antes); repintar(pc); });
  }

  function painel(pc) {
    if (!C() || !tem(pc)) return '';
    const n = quantas(pc), cs = caudasDe(pc).slice(0, n), ed = pode(pc), meu = mestre();
    const cartao = (c, i) => `<div class="kcauda${c.p ? ' cheia' : ''}${c.fer.length ? ' ferida' : ''}">
        <div class="kctopo"><span class="kcnum">${SV(c.p ? 'fogo' : 'raposa', 15)} Cauda ${i + 1}</span>
          ${c.p && ed ? `<span class="kcacoes"><button type="button" class="mini primary" data-kusar="${i}">Usar</button><button type="button" class="mini" data-ktirar="${i}" title="Descartar o poder sem usar">Tirar</button></span>` : ''}</div>
        ${c.p ? `<b class="kcpoder">${e(c.p.n || 'Poder')}${c.p.y ? ` <small>de ${e(c.p.y)}</small>` : ''}</b>${c.p.e ? `<p class="kctx">${e(c.p.e)}</p>` : ''}${c.p.f ? `<p class="kctx kcaviso">Ao usar, deixa ferida: ${e(c.p.f)}</p>` : ''}`
          : '<p class="kctx hint">Vazia.</p>'}
        ${c.fer.map((f, k) => `<p class="kcfer">${SV('impacto', 13)} Ferida: ${e(f)}${meu && ed ? ` <button type="button" class="mini" data-kcurar="${i}|${k}" title="Tirar a ferida (só quem mestra)">Tirar</button>` : ''}</p>`).join('')}
      </div>`;
    return `<div class="panel" id="painelCaudas" data-kpc="${e(pc.id)}">
      <div class="hd"><span class="eyebrow">${SV('raposa', 15)} Caudas da Kitsune</span>
        <span class="hint" style="margin-left:auto">o poder do yokai que ela comeu, guardado numa cauda</span>
        ${ed ? '<button type="button" class="mini primary" data-kguardar>+ Guardar poder</button>' : ''}</div>
      <div class="bd"><div class="kcaudas">${cs.map(cartao).join('')}</div>
        <p class="hint" style="margin:8px 0 0">Usar um poder não queima a cauda. Alguns poderes deixam uma ferida permanente na cauda; só o mestre tira.</p></div>
    </div>`;
  }

  function guardar(pc) {
    const ex = X(); if (!ex || !C() || !pode(pc)) return;
    const n = quantas(pc), cs = caudasDe(pc), L = C().LIM;
    const livre = cs.slice(0, n).findIndex(c => !c.p);
    const opc = Array.from({ length: n }, (_, i) => `<option value="${i}"${i === (livre < 0 ? 0 : livre) ? ' selected' : ''}>Cauda ${i + 1}${cs[i].p ? ' (troca ' + e(cs[i].p.n || 'o poder') + ')' : ' (vazia)'}</option>`).join('');
    const { m, fechar } = ex.janela('Guardar o poder de um yokai', `
      <p class="hint" style="margin:0 0 8px">${e(pc.nome || 'A Kitsune')} comeu um yokai: escreva o poder e escolha a cauda. Ele fica até ser usado.</p>
      <label class="f"><span class="eyebrow">Cauda</span><select data-kc>${opc}</select></label>
      <label class="f"><span class="eyebrow">Yokai</span><input data-ky maxlength="${L.yokai}" placeholder="ex.: Kappa" autocomplete="off"></label>
      <label class="f"><span class="eyebrow">Nome do poder</span><input data-kn maxlength="${L.nome}" placeholder="ex.: Pele de Água" autocomplete="off"></label>
      <label class="f"><span class="eyebrow">O que faz</span><textarea rows="2" data-ke maxlength="${L.efeito}" placeholder="ex.: Defesa tier II contra fogo por 2 turnos."></textarea></label>
      <label class="f"><span class="eyebrow">Ferida que deixa ao usar (deixe vazio se não deixa)</span><textarea rows="1" data-kf maxlength="${L.ferida}" placeholder="ex.: a cauda fica fria para sempre: -1 nos testes de DES no frio."></textarea></label>
      <p class="hint itjerro" data-kerro hidden></p>
      <div class="modalacts"><span style="margin-left:auto;display:flex;gap:8px"><button type="button" data-jcancela>Cancelar</button><button type="button" class="primary" data-kok>Guardar</button></span></div>`, 520);
    q(m, '[data-ky]').focus();
    q(m, '[data-kok]').onclick = () => {
      const p = { y: q(m, '[data-ky]').value, n: q(m, '[data-kn]').value, e: q(m, '[data-ke]').value, f: q(m, '[data-kf]').value }, i = +q(m, '[data-kc]').value;
      if (!p.n.trim() && !p.e.trim()) { const er = q(m, '[data-kerro]'); er.textContent = 'Escreva o nome do poder ou o que ele faz.'; er.hidden = false; return; }
      fechar();
      mexer(pc, { t: 'guardar', i, p }, 'O poder ' + (p.n.trim() || 'do yokai') + ' ficou na cauda ' + (i + 1) + '.');
    };
  }

  function ligar(host, pc) {
    if (!host || !tem(pc) || !pode(pc)) return;
    const b = q(host, '[data-kguardar]'); if (b) b.onclick = () => guardar(pc);
    qa(host, '[data-kusar]').forEach(x => x.onclick = () => {
      const i = +x.dataset.kusar;
      mexer(pc, { t: 'usar', i }, r => C().textoUso(pc.nome, i, r.usado) + (r.ferida ? ' A cauda ficou ferida: ' + r.ferida : ''));
    });
    qa(host, '[data-ktirar]').forEach(x => x.onclick = () => { const i = +x.dataset.ktirar; mexer(pc, { t: 'tirar', i }, 'O poder saiu da cauda ' + (i + 1) + ' sem ser usado.'); });
    qa(host, '[data-kcurar]').forEach(x => x.onclick = () => { const [i, k] = x.dataset.kcurar.split('|').map(Number); mexer(pc, { t: 'curar', i, k }, 'A ferida saiu da cauda ' + (i + 1) + '.'); });
  }
  function repintar(pc) {
    const el = document.getElementById('painelCaudas');
    if (!el || el.dataset.kpc !== pc.id) return;
    const t = document.createElement('div'); t.innerHTML = painel(pc);
    const novo = t.firstElementChild; if (!novo) { el.remove(); return; }
    el.replaceWith(novo); ligar(novo, pc);
  }
  return { tem, painel, ligar, guardar };
})();
