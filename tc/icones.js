/* =======================================================================
   TC.icones — os ícones das habilidades (lote 43; o guia "ícones de papel, tempo e barra", de 30/10).

   Três coisas de bater o olho, iguais em todo o site (a ficha e a Árvore):
     · o papel (o que a habilidade faz): o ícone principal, em tinta única — a forma é o que diferencia;
     · o tempo (quando ela entra): a marca num círculo — o raio dourado da reação, as pegadas da postura, o anel da
       passiva (Ativa fica sem);
     · a barra especial: as etiquetas ▼ gasta (laranja), ▲ enche (azul), ⇄ balança (tracejada). A seta diz a direção
       mesmo sem enxergar a cor, e nunca vem sem o número ou o nome da barra.
   As contas (qual papel, qual tempo, quais etiquetas) ficam em tc/rules.js; aqui ficam os desenhos e o HTML.

     navegador   <script src="tc/icones.js"></script> → window.TC.icones (põe na página os símbolos e o estilo, uma vez)
   Os símbolos são os do guia (grade de 24 px, traço de 2 px, pontas arredondadas); o traço vem do CSS. Cada página
   diz a cor do fundo da marca de tempo em --tci-papel e a do quadrado do ícone em --tci-fundo.
   ======================================================================= */
(function (root) {
  'use strict';
  const PRE = 'tci-';
  const SIMBOLOS = {
    ofensiva: '<path d="M20.5 3.5L19.8 7.6L9.8 17.6L6.4 14.2L16.4 4.2Z"/><path d="M4.6 12.4L11.6 19.4"/><path d="M8.1 15.9L4.2 19.8"/><circle cx="3.6" cy="20.4" r=".9" fill="currentColor"/>',
    defensiva: '<path d="M12 2.8L19.5 5.6V11.5C19.5 16.2 16.4 19.7 12 21.2C7.6 19.7 4.5 16.2 4.5 11.5V5.6Z"/>',
    suporte: '<path d="M9.5 3.5H14.5V9.5H20.5V14.5H14.5V20.5H9.5V14.5H3.5V9.5H9.5Z"/>',
    controle: '<rect x="2.2" y="5.6" width="11" height="6.6" rx="3.3" transform="rotate(35 7.7 8.9)"/><rect x="10.8" y="11.8" width="11" height="6.6" rx="3.3" transform="rotate(35 16.3 15.1)"/>',
    movimento: '<path d="M9 3.5H13.5V11.5C17 12.2 20.5 13.6 20.5 16.5V19.5H6.5V3.5Z"/><path d="M6.5 16.5H20.5"/><path d="M6.5 6L2 4.5"/><path d="M6.5 8.8L1.8 8.2"/><path d="M6.5 11.6L2.6 12"/>',
    invocacao: '<path d="M6 20.5V11C6 7.4 8.7 4.5 12 4.5S18 7.4 18 11V20.5L15.5 18.5L13.7 20.5L12 18.7L10.3 20.5L8.5 18.5Z"/><circle cx="9.8" cy="11" r=".9" fill="currentColor"/><circle cx="14.2" cy="11" r=".9" fill="currentColor"/>',
    fora: '<path d="M12 3.5C14.5 6.5 16 8.5 16 11.2A4 4 0 0 1 8 11.2C8 9.6 8.8 8.6 9.8 7.6C10 9 10.6 9.8 11.4 10C11 7.5 11.3 5.6 12 3.5Z"/><path d="M4 20.5L20 16.5"/><path d="M4 16.5L20 20.5"/>',
    utilidade: '<circle cx="8" cy="8" r="4.5"/><path d="M11.2 11.2L20.5 20.5"/><path d="M17 17L19.5 14.5"/><path d="M14.5 14.5L16.5 12.5"/>',
    reacao: '<path d="M13.5 2.5L5.5 13.5H11.5L10.5 21.5L18.5 10.5H12.5Z" fill="currentColor" stroke="none"/>',
    postura: '<path d="M7.5 3.5C9.5 3.5 10.5 5.5 10.5 8C10.5 10.5 9.3 12.5 7.5 12.5S4.5 10.5 4.5 8C4.5 5.5 5.5 3.5 7.5 3.5Z" fill="currentColor" stroke="none"/><path d="M16.5 9.5C18.5 9.5 19.5 11.5 19.5 14C19.5 16.5 18.3 18.5 16.5 18.5S13.5 16.5 13.5 14C13.5 11.5 14.5 9.5 16.5 9.5Z" fill="currentColor" stroke="none"/>',
    passiva: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/>',
    // (a estrela das favoritas, no mesmo traço)
    estrela: '<path d="M12 3.2L14.6 8.7L20.6 9.4L16.2 13.5L17.3 19.5L12 16.6L6.7 19.5L7.8 13.5L3.4 9.4L9.4 8.7Z"/>'
  };
  // As cores do guia (claro / escuro). O tema escuro é o padrão do site; o claro é data-tema="claro" (as Fichas) ou
  // "tinta" (a Árvore).
  const CSS = `
:root{--tci-gasta:#F08A55;--tci-gasta-f:#3A2A24;--tci-enche:#4FC3D6;--tci-enche-f:#1E3238;--tci-reacao:#E8B93F;--tci-tracejado:#8E95A6}
:root[data-tema="claro"],:root[data-tema="tinta"]{--tci-gasta:#D9622B;--tci-gasta-f:#FBE7DC;--tci-enche:#1F8FA6;--tci-enche-f:#DCF1F5;--tci-reacao:#C9971C;--tci-tracejado:#7A8193}
svg.tci{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none;overflow:visible}
.tci-quadro{position:relative;display:block;flex:none;width:42px;height:42px;padding:9px;border-radius:9px;background:var(--tci-fundo,rgba(128,128,128,.14));color:inherit;box-sizing:border-box}
.tci-quadro>svg.tci{display:block;width:24px;height:24px}
.tci-quadro.vazio{background:transparent;border:1.5px dashed var(--tci-vazio,rgba(128,128,128,.35))}
.tci-tempo{position:absolute;right:-8px;bottom:-8px;width:22px;height:22px;padding:3px;border-radius:50%;border:1.5px solid currentColor;background:var(--tci-papel,#fff);display:block;box-sizing:border-box}
.tci-tempo>svg.tci{display:block;width:100%;height:100%}
.tci-tempo.reacao{color:var(--tci-reacao)}
.tci-chips{display:inline-flex;flex-wrap:wrap;gap:5px;align-items:center}
.tci-chip{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:2px 9px 2px 7px;font-weight:700;font-size:12.5px;line-height:1.35;white-space:nowrap;border:1.5px solid;font-family:inherit;letter-spacing:normal;text-transform:none}
.tci-chip .s{font-size:.8em;line-height:1}
.tci-chip.gasta{color:var(--tci-gasta);background:var(--tci-gasta-f);border-color:var(--tci-gasta)}
.tci-chip.enche{color:var(--tci-enche);background:var(--tci-enche-f);border-color:var(--tci-enche)}
.tci-chip.balanca{color:inherit;background:transparent;border-color:var(--tci-tracejado);border-style:dashed}
.tci-chip.mini{font-size:11px;padding:1px 7px 1px 5px;gap:3px}
`;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const R = () => (root.TC && root.TC.rules) || null;

  // Põe os símbolos e o estilo na página (uma vez; pode ser chamado antes de a página terminar de carregar).
  function injetar(doc) {
    doc = doc || (typeof document !== 'undefined' ? document : null);
    if (!doc) return;
    if (!doc.getElementById('tci-css') && doc.head) { const st = doc.createElement('style'); st.id = 'tci-css'; st.textContent = CSS; doc.head.appendChild(st); }
    if (!doc.getElementById('tci-sprite') && doc.body) {
      const d = doc.createElement('div');
      d.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" id="tci-sprite" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false"><defs>'
        + Object.keys(SIMBOLOS).map(id => '<symbol id="' + PRE + id + '" viewBox="0 0 24 24">' + SIMBOLOS[id] + '</symbol>').join('') + '</defs></svg>';
      doc.body.insertBefore(d.firstChild, doc.body.firstChild);
    }
  }
  if (typeof document !== 'undefined') {
    injetar();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => injetar());
  }

  const temSimbolo = id => Object.prototype.hasOwnProperty.call(SIMBOLOS, id);
  // <svg class="tci"><use href="#tci-ofensiva"/></svg> (sem nome: quem usa diz o nome no elemento de fora)
  function svg(id, cls) {
    if (!temSimbolo(id)) return '';
    injetar();
    return '<svg class="tci' + (cls ? ' ' + esc(cls) : '') + '" aria-hidden="true" focusable="false"><use href="#' + PRE + id + '"></use></svg>';
  }
  // a marca de tempo, num círculo (reação dourada)
  const marcaTempo = (tempo, cls) => (tempo && temSimbolo(tempo) ? '<span class="tci-tempo ' + esc(tempo) + (cls ? ' ' + esc(cls) : '') + '">' + svg(tempo) + '</span>' : '');
  /* O quadrado do ícone (42 px), com a marca de tempo no canto de baixo, à direita. rotulo: o nome por extenso (vai no
     title e no aria-label). Sem papel, o quadrado fica vazio (tracejado), para a lista não perder o alinhamento. */
  function quadro(papel, tempo, rotulo, cls) {
    const temP = temSimbolo(papel) && papel !== 'reacao' && papel !== 'postura' && papel !== 'passiva' && papel !== 'estrela';
    const nome = String(rotulo || '').trim();
    return '<span class="tci-quadro' + (temP ? '' : ' vazio') + (cls ? ' ' + esc(cls) : '') + '"' + (nome ? ' role="img" aria-label="' + esc(nome) + '" title="' + esc(nome) + '"' : ' aria-hidden="true"') + '>'
      + (temP ? svg(papel) : '') + marcaTempo(tempo) + '</span>';
  }
  // uma etiqueta: <span class="tci-chip gasta"><span class="s">▼</span>2 Geada</span>
  function etiqueta(e, mini) {
    const r = R();
    if (!e || !r) return '';
    const seta = (r.SETA_BARRA || {})[e.k] || '', resto = r.textoDaEtiqueta(e).slice(seta.length + 1), fala = r.falaDaEtiqueta(e);
    const nome = fala.charAt(0).toUpperCase() + fala.slice(1);
    return '<span class="tci-chip ' + esc(e.k) + (mini ? ' mini' : '') + '" data-sem-tags title="' + esc(nome) + '"><span class="s" aria-hidden="true">' + seta + '</span>' + esc(resto) + '</span>';
  }
  // (data-sem-tags: o glossário das tags não sublinha o nome da barra dentro da etiqueta)
  const etiquetas = (lista, mini) => ((lista || []).length ? '<span class="tci-chips" data-sem-tags>' + lista.map(e => etiqueta(e, mini)).join('') + '</span>' : '');

  const api = { PRE, SIMBOLOS, CSS, injetar, svg, marcaTempo, quadro, etiqueta, etiquetas, temSimbolo };
  (root.TC || (root.TC = {})).icones = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
