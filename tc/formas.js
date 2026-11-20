/* (lote 188) As formas: as habilidades de transformação (o Druida vira urso, o Lobisomem vira lobo, a Kitsune Nirus vira
   raposa, o Vampiro vira névoa ou morcego…). Cada uma pode ter uma imagem, que a ficha guarda (ficha.formas: { id da
   habilidade: endereço da imagem }); quando a habilidade é usada nas Cenas, o token troca de imagem, e volta quando a
   condição Transformado acaba (ou no fim do combate).
   ehForma(n): a habilidade é de transformação? n = { nome, texto } (o texto de todos os níveis) ou um nó da árvore. */
(function (root) {
  'use strict';
  const BICHO = '(?:fera|lobo|lobos|raposa|morcego|névoa|nevoa|besta|urso|animal|bicho|espírito|criatura|monstro|cobra|ave|corvo|gato|felino|serpente|dragão)';
  const RX = new RegExp('(?:^|[.:;]\\s+|(?<!por )\\bvocê |\\be )vira(?:m)? (?:o |a |um |uma |meia |sua |seu )?' + BICHO + '|(?:^|[.:;]\\s+)(?:você )?(?:assume|toma|ganha) a forma|\\bvocê se transforma|pele de raposa', 'i');
  const RX_NOME = /^(?:Forma d|Transformar$|Meia Fera$)/i;
  const NAO = /^(?:em forma de|na forma de)/i;           // "Em forma de raposa, …": pede a forma, não transforma
  function textoDe(n) {
    if (!n) return '';
    if (typeof n.texto === 'string') return n.texto;
    return (Array.isArray(n.graus) ? n.graus.map(g => (g && g.texto) || '').join(' ') : '') + ' ' + String(n.desc || '');
  }
  function ehForma(n) {
    if (!n) return false;
    const t = textoDe(n).trim();
    if (RX_NOME.test(String(n.nome || ''))) return true;
    if (NAO.test(t)) return false;
    return RX.test(t);
  }
  // quantos turnos a forma dura, pelo texto ("por 3 turnos"); 0 = até alguém tirar
  function turnosDe(texto) {
    const m = /por (\d+) turnos?/i.exec(String(texto || ''));
    return m ? Math.max(1, Math.min(20, +m[1])) : 0;
  }
  const okUrl = u => typeof u === 'string' && /^(https:\/\/|data:image\/(png|jpeg|webp);base64,)/.test(u) && u.length < 400000;
  function normFormas(v) {
    const out = {};
    if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
    for (const k of Object.keys(v)) if (/^[A-Za-z0-9_-]{1,60}$/.test(k) && okUrl(v[k])) out[k] = v[k];
    return out;
  }
  /* (lote 193, pedido do Dalmo) as formas grandes: usar a habilidade deixa o token Transformado e Agigantado (o dobro do
     tamanho no mapa), com ou sem imagem na ficha; o Agigantado sai junto com o Transformado. */
  const GRANDES = ['n_druida_acab', 'n_druida_aya', 'n_druida_ak1', 'n_druida_ac1'];   // Urso de Casca, Behemoth, Grande Espírito, Grifo Verde
  const grande = id => GRANDES.includes(String(id || ''));
  const API = { ehForma, turnosDe, normFormas, okUrl, GRANDES, grande };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) { root.TC = root.TC || {}; root.TC.formas = API; }
})(typeof window !== 'undefined' ? window : null);
