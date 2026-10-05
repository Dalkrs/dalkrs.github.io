/* Tiny Cats · ponte entre um sistema (Cenas, Fichas, Árvore, Rolador) e a casca do site.
   A casca cuida da conta, da mesa e do banco; o sistema fala com ela por aqui:
     TC.ponte.estado / aoMudar   — qual mesa está aberta, o papel de quem usa, quem participa
     TC.ponte.pronta             — promessa: resolve quando o estado chegou (ou logo, se não há casca)
     TC.ponte.publicar           — "rolei isto": a casca decide se e como vai para a mesa ao vivo
     TC.dados.col(nome)          — personagens e documentos da mesa aberta (só dentro da casca, com mesa)
     TC.ponte.ir(aba, alvo)      — abre outro sistema do site (ex.: ir('cenas', { cena: id })); só dentro da casca
     TC.ponte.aoIr(fn)           — este sistema foi aberto por outro, com um alvo: fn(alvo)
     TC.ponte.aoFechar(fn)       — a página vai fechar (ou a mesa, trocar): fn() entrega agora o que o sistema ainda segurava
   Sem a casca (página do sistema aberta sozinha) ou sem mesa, nada disso age: o sistema funciona como sempre. */
(() => {
  'use strict';
  const TC = (window.TC = window.TC || {});
  const naCasca = window.parent !== window;
  let canal = null;
  try { canal = new BroadcastChannel('tinycats'); } catch (e) { /* navegador sem BroadcastChannel: só funciona dentro da casca */ }
  const ouvintes = [], ouvintesIr = [], ouvintesFechar = [];
  let avisar, alvoGuardado = null;        // um alvo que chegou antes de o sistema estar pronto para ouvir
  const ponte = {
    // mesa: { id, nome } | null · papel: 'mestre' | 'jogador' | null · eu: id do usuário · membros: [{ id, nome, papel, cor }]
    estado: { mesa: null, papel: null, segredo: false, eu: null, membros: [] },
    naCasca,
    publicar(origem, dados) { enviar({ t: 'rolagem', origem, dados }); },
    ir(aba, alvo) { if (!naCasca) return false; enviar({ t: 'ir', aba, alvo: alvo || null }); return true; },
    aoIr(fn) { ouvintesIr.push(fn); if (alvoGuardado) { const a = alvoGuardado; alvoGuardado = null; try { fn(a); } catch (e) { console.error(e); } } },
    aoMudar(fn) { ouvintes.push(fn); try { fn(ponte.estado); } catch (e) { console.error(e); } },
    aoFechar(fn) { ouvintesFechar.push(fn); },
    /* A casca chama isto (direto, não por mensagem) quando a página vai fechar ou a mesa vai trocar: cada sistema
       entrega agora o que ainda segurava. */
    fechando() { for (const f of ouvintesFechar.slice()) { try { f(); } catch (e) { console.error(e); } } },
  };
  ponte.pronta = new Promise(ok => { avisar = ok; });
  // Dentro da casca a resposta sempre vem; o prazo é só para a página não ficar presa se algo der errado.
  setTimeout(() => avisar(ponte.estado), naCasca ? 5000 : 350);

  function enviar(msg) {
    /* O que é gravado vai para a casca na hora, por chamada direta (a casca e os sistemas são páginas do mesmo
       site). Por mensagem, uma gravação feita no instante em que a página fecha não chegaria: a casca sairia antes. */
    if (naCasca && msg.t === 'dados.gravar') {
      try { const d = window.parent.TC && window.parent.TC.daPonteDireto; if (d) { d(msg, window); return; } } catch (e) { /* segue por mensagem */ }
    }
    try {
      if (naCasca) window.parent.postMessage({ tinycats: msg }, location.origin);
      else if (canal) canal.postMessage(msg);
    } catch (e) { /* a mesa é opcional */ }
  }

  /* ---- dados da mesa ---- */
  const cols = {}, esperas = {};
  let seq = 0;
  // as contas de "o que mudou" são as da casca (a página de fora, do mesmo site)
  const remendo = () => { try { const d = naCasca && window.parent.TC && window.parent.TC.dados; return (d && d.remendo) || null; } catch (e) { return null; } };
  const dados = {
    disponivel: () => naCasca && !!ponte.estado.mesa,
    col(nome) {
      if (cols[nome]) return cols[nome].api;
      // (a mesa de quando a coleção foi aberta vai em cada gravação: se a casca já estiver em outra mesa, ela não aceita)
      const c = cols[nome] = { linhas: new Map(), ouvintes: [], mesa: ponte.estado.mesa ? ponte.estado.mesa.id : null };
      const n = ++seq;
      const pronta = new Promise((ok, falha) => { esperas[n] = { ok, falha, c }; });
      enviar({ t: 'dados.abrir', col: nome, n });
      c.api = {
        pronta,
        todas: () => [...c.linhas.values()],
        pegar: id => c.linhas.get(id) || null,
        /* O estado e as skills de um personagem não vão inteiros: vai só o que mudou, contado a partir do que este
           sistema tinha em mãos — a cópia daqui ou, se quem grava trabalhava sobre outra, a que ele passar em
           `base.estado` / `base.skills`. Assim o que outra pessoa mexeu no mesmo personagem nesse meio-tempo (outra
           barra, as moedas, os pontos que o mestre deu) não é desfeito.
           (Quais colunas vão assim é a casca que diz: uma casca mais antiga só junta o estado, e recebe as skills inteiras.) */
        gravar(id, campos, base) {
          const atual = c.linhas.get(id), R = remendo();
          const cols = nome === 'personagens' && atual && campos && R ? (R.colunas || ['estado']).filter(k => campos[k] !== undefined) : [];
          if (cols.length) {
            const resto = Object.assign({}, campos), mudas = {};
            for (const k of cols) { delete resto[k]; const muda = R.diferenca(base && base[k] !== undefined ? base[k] : atual[k], campos[k]); if (muda) mudas[k] = muda; }
            const l = Object.assign({}, atual, resto);
            for (const k in mudas) l[k] = R.aplicar(atual[k], mudas[k]);
            c.linhas.set(id, l);
            if (Object.keys(mudas).length || Object.keys(resto).length) enviar({ t: 'dados.gravar', col: nome, id, campos: resto, mudas, muda: mudas.estado || null, mesa: c.mesa });
            return l;
          }
          const l = Object.assign({}, atual || { id }, campos); c.linhas.set(id, l); enviar({ t: 'dados.gravar', col: nome, id, campos, mesa: c.mesa }); return l;
        },
        apagar(id) { c.linhas.delete(id); enviar({ t: 'dados.gravar', col: nome, id, campos: { apagado: true }, mesa: c.mesa }); },
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
    if (m.t === 'alvo') {
      if (!m.alvo) return;
      if (!ouvintesIr.length) { alvoGuardado = m.alvo; return; }
      for (const f of ouvintesIr.slice()) { try { f(m.alvo); } catch (e) { console.error(e); } }
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
