/* O tema do site: escuro (o padrão), claro, ou igual ao do aparelho. A escolha fica neste navegador (localStorage) e
   vale para a casca e para todos os sistemas — todos são páginas do mesmo site: quando muda numa, as outras ficam
   sabendo pelo evento "storage". No tema claro a raiz do documento ganha o atributo data-claro, e as regras de cor do
   tema claro de cada página são escritas para ele (`:root[data-claro]`). Roda no <head>, antes da página aparecer,
   para ela já nascer com as cores certas. As Cenas trazem uma cópia deste arquivo dentro delas (src/cenas/build.sh). */
(function () {
  if (window.TinyTema) return;
  var CHAVE = 'tinycats:tema';
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
  var ouvintes = [];
  function pref() {
    var v = null;
    try { v = localStorage.getItem(CHAVE); } catch (e) { /* sem armazenamento: vale o padrão */ }
    return v === 'claro' || v === 'aparelho' ? v : 'escuro';
  }
  function claro() { var p = pref(); return p === 'claro' || (p === 'aparelho' && !!(mq && mq.matches)); }
  var antes = null;
  function aplicar() {
    var c = claro(), r = document.documentElement;
    if (c) r.setAttribute('data-claro', ''); else r.removeAttribute('data-claro');
    if (antes !== null && antes !== c) for (var i = 0; i < ouvintes.length; i++) { try { ouvintes[i](c); } catch (e) { console.error(e); } }
    antes = c;
  }
  aplicar();
  window.addEventListener('storage', function (e) { if (e.key === CHAVE || e.key === null) aplicar(); });
  if (mq) { var seguir = function () { if (pref() === 'aparelho') aplicar(); }; if (mq.addEventListener) mq.addEventListener('change', seguir); else if (mq.addListener) mq.addListener(seguir); }
  window.TinyTema = {
    pref: pref,
    claro: claro,
    definir: function (v) { try { localStorage.setItem(CHAVE, v); } catch (e) { /* só nesta página */ } aplicar(); },
    aoMudar: function (fn) { if (typeof fn === 'function') ouvintes.push(fn); },
  };
})();
