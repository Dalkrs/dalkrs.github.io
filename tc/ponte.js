/* Tiny Cats · ponte entre um sistema (Cenas, Fichas, Árvore, Rolador) e a casca do site.
   A casca cuida da conta, da mesa e do banco; o sistema fala com ela por aqui:
     TC.ponte.estado / aoMudar   — qual mesa está aberta, o papel de quem usa, quem participa
     TC.ponte.pronta             — promessa: resolve quando o estado chegou (ou logo, se não há casca)
     TC.ponte.publicar           — "rolei isto": a casca decide se e como vai para a mesa ao vivo
     TC.dados.col(nome)          — personagens e documentos da mesa aberta (só dentro da casca, com mesa)
   Sem a casca (página do sistema aberta sozinha) ou sem mesa, nada disso age: o sistema funciona como sempre. */
(() => {
  'use strict';
  const TC = (window.TC = window.TC || {});
  const naCasca = window.parent !== window;
  let canal = null;
  try { canal = new BroadcastChannel('tinycats'); } catch (e) { /* navegador sem BroadcastChannel: só funciona dentro da casca */ }
  const ouvintes = [];
  let avisar;
  const ponte = {
    // mesa: { id, nome } | null · papel: 'mestre' | 'jogador' | null · eu: id do usuário · membros: [{ id, nome, papel, cor }]
    estado: { mesa: null, papel: null, segredo: false, eu: null, membros: [] },
    naCasca,
    publicar(origem, dados) { enviar({ t: 'rolagem', origem, dados }); },
    aoMudar(fn) { ouvintes.push(fn); try { fn(ponte.estado); } catch (e) { console.error(e); } },
  };
  ponte.pronta = new Promise(ok => { avisar = ok; });
  // Dentro da casca a resposta sempre vem; o prazo é só para a página não ficar presa se algo der errado.
  setTimeout(() => avisar(ponte.estado), naCasca ? 5000 : 350);

  function enviar(msg) {
    try {
      if (naCasca) window.parent.postMessage({ tinycats: msg }, location.origin);
      else if (canal) canal.postMessage(msg);
    } catch (e) { /* a mesa é opcional */ }
  }

  /* ---- dados da mesa ---- */
  const cols = {}, esperas = {};
  let seq = 0;
  const dados = {
    disponivel: () => naCasca && !!ponte.estado.mesa,
    col(nome) {
      if (cols[nome]) return cols[nome].api;
      const c = cols[nome] = { linhas: new Map(), ouvintes: [] };
      const n = ++seq;
      const pronta = new Promise((ok, falha) => { esperas[n] = { ok, falha, c }; });
      enviar({ t: 'dados.abrir', col: nome, n });
      c.api = {
        pronta,
        todas: () => [...c.linhas.values()],
        pegar: id => c.linhas.get(id) || null,
        gravar(id, campos) { const l = Object.assign({}, c.linhas.get(id) || { id }, campos); c.linhas.set(id, l); enviar({ t: 'dados.gravar', col: nome, id, campos }); return l; },
        apagar(id) { c.linhas.delete(id); enviar({ t: 'dados.gravar', col: nome, id, campos: { apagado: true } }); },
        aoMudar(fn) { c.ouvintes.push(fn); },
      };
      return c.api;
    },
  };

  /* ---- imagens da mesa ---- */
  const arquivos = {
    subir(blob) { const n = ++seq; const p = new Promise((ok, falha) => { esperas[n] = { ok, falha }; }); enviar({ t: 'arquivo.subir', n, blob }); return p; },
    apagar(url) { enviar({ t: 'arquivo.apagar', url }); },
  };

  function receber(m) {
    if (!m || typeof m !== 'object') return;
    if ((m.t === 'arquivo.ok' || m.t === 'arquivo.erro') && esperas[m.n]) {
      const e = esperas[m.n]; delete esperas[m.n];
      if (m.t === 'arquivo.ok') e.ok(m.url); else e.falha(new Error(m.erro || 'Não deu para enviar a imagem.'));
      return;
    }
    if (m.t === 'estado') {
      ponte.estado = { mesa: m.mesa || null, papel: m.papel || null, segredo: !!m.segredo, eu: m.eu || null, membros: m.membros || [] };
      avisar(ponte.estado);
      for (const f of ouvintes.slice()) { try { f(ponte.estado); } catch (e) { console.error(e); } }
    } else if (m.t === 'dados.tudo' && esperas[m.n]) {
      const e = esperas[m.n]; delete esperas[m.n];
      for (const l of m.linhas || []) e.c.linhas.set(l.id, l);
      e.ok(true);
    } else if (m.t === 'dados.erro' && esperas[m.n]) {
      const e = esperas[m.n]; delete esperas[m.n];
      e.falha(new Error(m.erro || 'Não deu para ler os dados da mesa.'));
    } else if (m.t === 'dado' && cols[m.col]) {
      const c = cols[m.col], l = m.linha;
      if (!l || !l.id) return;
      if (l.apagado) c.linhas.delete(l.id); else c.linhas.set(l.id, l);
      for (const f of c.ouvintes.slice()) { try { f(l); } catch (e) { console.error(e); } }
    }
  }
  window.addEventListener('message', ev => { if (ev.origin === location.origin && ev.source === window.parent && ev.data && ev.data.tinycats) receber(ev.data.tinycats); });
  if (canal) canal.onmessage = ev => { if (!naCasca) receber(ev.data); };
  TC.ponte = ponte; TC.dados = dados; TC.arquivos = arquivos;
  enviar({ t: 'ola' });
})();
