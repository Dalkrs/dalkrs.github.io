/* Tiny Cats · Fichas · as formas (lote 188).
   Na aba Skills: as habilidades de transformação que o personagem comprou (o Druida vira urso, o Lobisomem vira lobo, a
   Kitsune Nirus vira raposa…), cada uma com a imagem da forma. Quem pode mexer na ficha (o mestre ou o dono) põe, troca
   ou tira a imagem. Nas Cenas, usar a habilidade troca a imagem do token, e ela volta quando a forma acaba (a condição
   Transformado sai) ou no fim do combate. Fica em ficha.formas: { id da habilidade: endereço da imagem }. */
const FichasFormas = (() => {
  'use strict';
  const F = () => (window.TC && window.TC.formas) || null;
  const M = () => (typeof FichasMesa !== 'undefined' ? FichasMesa : null);
  const X = () => (typeof FichasExtras !== 'undefined' ? FichasExtras : null);
  const e = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pode = pc => !M() || M().podeEditar(pc);
  // as formas compradas: [{ id, nome, arv, img }]
  function lista(pc) {
    if (!F() || !pc || !pc.skills || !Array.isArray(pc.skills.arvores)) return [];
    const al = pc.skills.alocados || {}, bib = typeof BIBX === 'function' ? (BIBX() || {}) : {}, fm = F().normFormas(pc.formas), out = [];
    for (const a of (bib.arvores || []).filter(x => pc.skills.arvores.includes(x.id))) {
      for (const n of a.nodes || []) {
        const origem = /_o$/.test(n.id || '');
        if (!(origem || (Number(al[n.id]) || 0) > 0) || !F().ehForma(n)) continue;
        out.push({ id: n.id, nome: origem ? (/^([^:]{3,40}):/.exec((n.graus && n.graus[0] && n.graus[0].texto) || '') || [, n.nome])[1] : n.nome, arv: a.nome, img: fm[n.id] || null });
      }
    }
    return out;
  }
  function painel(pc) {
    const l = lista(pc);
    if (!l.length) return '';
    const ed = pode(pc);
    return `<div class="panel" id="painelFormas" style="margin-bottom:18px">
      <div class="hd"><span class="eyebrow">Formas</span><span class="hint" style="margin-left:auto">a imagem do token quando ${e(pc.nome || 'o personagem')} se transforma</span></div>
      <div class="bd fmlista">${l.map(f => `<div class="fmrow" data-fm="${e(f.id)}">
        <span class="fmimg">${f.img ? `<img src="${e(f.img)}" alt="">` : '<span>sem imagem</span>'}</span>
        <span class="fmtx"><b>${e(f.nome)}</b><small>${e(f.arv)}</small></span>
        ${ed ? `<span class="fmbt"><button type="button" class="mini primary" data-fmbt="${e(f.id)}">${f.img ? 'Trocar' : 'Pôr imagem'}</button><input type="file" accept="image/png,image/jpeg,image/webp" hidden data-fmup="${e(f.id)}">${f.img ? `<button type="button" class="mini" data-fmtira="${e(f.id)}">Tirar</button>` : ''}</span>` : ''}
      </div>`).join('')}</div>
      <p class="hint" style="margin:6px 14px 12px">Nas Cenas, usar a habilidade troca a imagem do token. Ela volta quando a forma acaba (a condição Transformado sai) ou no fim do combate.</p>
    </div>`;
  }
  function ligar(el, pc) {
    if (!el || !pode(pc)) return;
    for (const inp of el.querySelectorAll('[data-fmup]')) inp.onchange = async () => {
      const arq = inp.files && inp.files[0], id = inp.dataset.fmup;
      if (!arq) return;
      if (!/^image\/(png|jpeg|webp)$/.test(arq.type || '')) { toast('Escolha uma imagem PNG, JPG ou WebP.'); return; }
      try {
        const url = await X().guardarImagem(arq);
        const antes = Object.assign({}, pc.formas || {});
        pc.formas = Object.assign({}, F().normFormas(pc.formas), { [id]: url });
        save(); render();
        if (X() && X().aviso) X().aviso('Imagem da forma posta.', 'Desfazer', () => { pc.formas = antes; save(); render(); }); else toast('Imagem da forma posta.');
      } catch (er) { toast((er && er.message) || 'Não deu para usar esta imagem.'); }
    };
    for (const b of el.querySelectorAll('[data-fmbt]')) b.onclick = () => { const i = el.querySelector(`[data-fmup="${CSS.escape(b.dataset.fmbt)}"]`); if (i) i.click(); };
    for (const b of el.querySelectorAll('[data-fmtira]')) b.onclick = () => {
      const antes = Object.assign({}, pc.formas || {}), fm = F().normFormas(pc.formas);
      delete fm[b.dataset.fmtira];
      pc.formas = fm; if (!Object.keys(fm).length) delete pc.formas;
      save(); render();
      if (X() && X().aviso) X().aviso('Imagem da forma tirada.', 'Desfazer', () => { pc.formas = antes; save(); render(); }); else toast('Imagem da forma tirada.');
    };
  }
  return { lista, painel, ligar };
})();
