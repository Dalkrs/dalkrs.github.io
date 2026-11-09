/* Tiny Cats · Fichas · a reputação com as facções (lote 126).
   Na aba Social da ficha, depois dos Relacionamentos: uma linha por facção do Mapa-múndi, de −100 a +100, com o nível
   (Odiado, Hostil, Neutro, Amigo, Honrado, Venerado) e a barrinha. Só quem mestra muda (o número, −5/−1/+1/+5) e
   escolhe, pelo olho, se o jogador vê aquela facção. Quem joga vê as que o mestre deixou, só para ler.
   Aparece nas fichas de jogador numa mesa (e em qualquer ficha fora da mesa). A conta é de TC.reputacao; os valores
   escondidos ficam com o mestre (FichasMesa.repSegDe / porRepSeg, em fichas:segredos). */
const FichasRep = (() => {
  'use strict';
  const R = () => window.TC && TC.reputacao;
  const M = () => (typeof FichasMesa !== 'undefined' ? FichasMesa : null);
  const q = (el, s) => el.querySelector(s), qa = (el, s) => [...el.querySelectorAll(s)];
  const e = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const BANDEIRA = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4M5 4h11l-2.5 4L16 12H5"/></svg>';
  const sinal = v => (v > 0 ? '+' + v : v < 0 ? '−' + Math.abs(v) : '0');

  const naMesa = () => !!(M() && M().ativo());
  const mestra = () => !naMesa() || M().mestre();
  const usa = pc => !!pc && !pc.petDe && (!naMesa() || M().deJogador(pc) || !!(pc.estado && (pc.estado.rep || pc.estado.repOc)));
  const facs = () => (M() && M().faccoesDaMesa ? M().faccoesDaMesa() : []);
  const seg = pc => (naMesa() && M().mestre() ? M().repSegDe(pc) : null);
  const linhasDe = pc => (R() ? R().linhas(pc.estado || {}, seg(pc), facs(), mestra()) : []);

  function linha(pc, l) {
    const fx = R().faixa(l.v), nv = fx.nivel, f = e(l.f), M_ = mestra();
    const cor = l.cor ? ' style="--fac:' + e(l.cor) + '"' : '';
    const olho = M_ && naMesa() ? `<button type="button" class="olho" data-repolho="${f}" aria-pressed="${!l.oc}" title="${l.oc ? 'O jogador não vê esta facção. Clique para mostrar.' : 'O jogador vê esta reputação. Clique para esconder.'}" aria-label="${e('Reputação com ' + l.n + ': ' + (l.oc ? 'escondida do jogador' : 'o jogador vê'))}">${l.oc ? M().OLHO_FECHADO : M().OLHO}</button>` : '';
    const passos = M_ ? `<span class="mbts">${[-5, -1, 1, 5].map(d => `<button type="button" class="mini" data-repstep="${f}|${d}">${d > 0 ? '+' + d : '−' + Math.abs(d)}</button>`).join('')}</span>` : '';
    const val = M_ ? `<input type="number" min="-100" max="100" step="1" data-repval="${f}" value="${l.v}" aria-label="${e('Reputação com ' + l.n + ', de −100 a 100')}">` : `<b>${sinal(l.v)}</b>`;
    return `<div class="reprow rep-${nv.k}${l.oc ? ' guardada' : ''}" data-rep="${f}"${cor}>
      <span class="repnome"><i class="repcor" aria-hidden="true"></i><span>${e(l.n)}</span></span>
      <div class="repbar" role="img" aria-label="${e(l.n + ': ' + sinal(l.v) + ', ' + nv.n)}"><i style="${l.v >= 0 ? 'left:50%;width:' + (l.v / 2) + '%' : 'right:50%;width:' + (-l.v / 2) + '%'}"></i></div>
      <span class="repval">${val}</span>
      <span class="repnivel" title="${e(nv.n + ': de ' + sinal(fx.de) + ' a ' + sinal(fx.ate))}">${e(nv.n)}</span>
      ${passos}
      <span class="repfim">${olho}</span>
      ${l.oc && M_ && naMesa() ? '<span class="relmarca"><span class="tagseg" title="Esta reputação fica guardada com você: o jogador não a recebe">só você vê</span></span>' : ''}
    </div>`;
  }
  function painel(pc) {
    if (!R() || !usa(pc)) return '';
    const ls = linhasDe(pc), M_ = mestra();
    const vazio = M_ ? 'Nenhuma facção ainda. As facções vêm do Mapa-múndi (aba Facções do mapa).' : 'O mestre ainda não mostrou nenhuma reputação.';
    return `<div class="panel" id="painelRep" style="margin-bottom:18px">
      <div class="hd"><span class="eyebrow">${BANDEIRA} Reputação com as facções</span>
        <span class="hint" style="margin-left:auto">de −100 (Odiado) a +100 (Venerado)${M_ && naMesa() ? ' · só você muda; o olho diz se o jogador vê' : ''}</span></div>
      <div class="bd">
        <div class="reps">${ls.map(l => linha(pc, l)).join('') || `<div class="hint">${vazio}</div>`}</div>
        <div class="repniveis hint">${R().NIVEIS.slice().reverse().map(n => `<span class="rep-${n.k}">${e(n.n)}</span>`).join(' · ')}</div>
      </div>
    </div>`;
  }
  function pintar(pc, focar) {
    const velho = document.getElementById('painelRep'); if (!velho) return;
    const tmp = document.createElement('div'); tmp.innerHTML = painel(pc);
    const novo = tmp.firstElementChild;
    if (!novo) { velho.remove(); return; }
    velho.replaceWith(novo);
    ligar(novo.parentNode, pc);
    if (focar) { const el = novo.querySelector(focar); if (el) el.focus(); }
  }
  // uma mudança: no estado da ficha e, se escondida, com o mestre (num passo só de desfazer)
  function mexer(pc, op, focar, avisar) {
    const fac = facs().find(x => x.id === op.f) || null, antes = { estado: JSON.parse(JSON.stringify(pc.estado || {})), seg: seg(pc) };
    const r = R().mudar(pc.estado || {}, seg(pc), op, fac);
    if (!r.mudou) { pintar(pc, focar); return; }
    pc.estado = r.estado;
    if (r.seg && naMesa()) M().porRepSeg(pc, r.seg);
    if (typeof save === 'function') save();
    pintar(pc, focar);
    if (avisar && typeof FichasExtras !== 'undefined') FichasExtras.aviso(avisar, 'Desfazer', () => { pc.estado = antes.estado; if (antes.seg && naMesa()) M().porRepSeg(pc, antes.seg); if (typeof save === 'function') save(); pintar(pc); });
  }
  function ligar(host, pc) {
    const p = q(host, '#painelRep'); if (!p || !mestra()) return;
    const nome = f => { const l = linhasDe(pc).find(x => x.f === f); return l ? l.n : ''; };
    qa(p, '[data-repval]').forEach(i => i.onchange = () => mexer(pc, { t: 'valor', f: i.dataset.repval, n: nome(i.dataset.repval), v: Number(i.value) }, '[data-repval="' + i.dataset.repval + '"]'));
    qa(p, '[data-repstep]').forEach(b => b.onclick = () => { const [f, d] = b.dataset.repstep.split('|'); mexer(pc, { t: 'mais', f, n: nome(f), d: Number(d) }, '[data-repstep="' + b.dataset.repstep + '"]'); });
    qa(p, '[data-repolho]').forEach(b => b.onclick = () => {
      const f = b.dataset.repolho, l = linhasDe(pc).find(x => x.f === f); if (!l) return;
      const dono = (M().nomeDoDono && M().nomeDoDono(pc)) || 'O jogador';
      mexer(pc, { t: l.oc ? 'mostrar' : 'esconder', f, n: l.n }, '[data-repolho="' + f + '"]', l.oc ? dono + ' agora vê a reputação com ' + l.n + '.' : dono + ' deixou de ver a reputação com ' + l.n + '.');
    });
  }
  return { painel, ligar, pintar, usa, linhasDe };
})();
