/* Tiny Cats · ponte entre um sistema (Cenas, Fichas, Árvore, Rolador) e a casca do site.
   O sistema avisa "rolei isto"; a casca, que cuida da conta e da mesa, decide se e como isso vai para a mesa ao vivo.
   Sem a casca aberta (página do sistema sozinha, sem mesa) nada acontece: o sistema funciona igual. */
(() => {
  'use strict';
  const TC = (window.TC = window.TC || {});
  const naCasca = window.parent !== window;
  let canal = null;
  try { canal = new BroadcastChannel('tinycats'); } catch (e) { /* navegador sem BroadcastChannel: só funciona dentro da casca */ }
  const ouvintes = [];
  const ponte = {
    // { mesa: { id, nome } | null, papel: 'mestre' | 'jogador' | null, segredo: boolean }
    estado: { mesa: null, papel: null, segredo: false },
    publicar(origem, dados) { enviar({ t: 'rolagem', origem, dados }); },
    aoMudar(fn) { ouvintes.push(fn); try { fn(ponte.estado); } catch (e) { console.error(e); } },
  };
  function enviar(msg) {
    try {
      if (naCasca) window.parent.postMessage({ tinycats: msg }, location.origin);
      else if (canal) canal.postMessage(msg);
    } catch (e) { /* a mesa é opcional */ }
  }
  function receber(m) {
    if (!m || m.t !== 'estado') return;
    ponte.estado = { mesa: m.mesa || null, papel: m.papel || null, segredo: !!m.segredo };
    for (const f of ouvintes.slice()) { try { f(ponte.estado); } catch (e) { console.error(e); } }
  }
  window.addEventListener('message', ev => { if (ev.origin === location.origin && ev.source === window.parent && ev.data && ev.data.tinycats) receber(ev.data.tinycats); });
  if (canal) canal.onmessage = ev => { if (!naCasca) receber(ev.data); };
  TC.ponte = ponte;
  enviar({ t: 'ola' });
})();
