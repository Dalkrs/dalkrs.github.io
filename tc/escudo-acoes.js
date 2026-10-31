/* Tiny Cats · o Escudo do mestre (lote 31): o que se faz com as sessões, os relógios e os handouts — o mesmo na aba
   Escudo, no painel do roteiro (na casca) e no vigia (na casca do mestre, que aplica o que acontece quando os
   jogadores resolvem ou erram um puzzle e mantém o que a mesa vê dos relógios).
   TC.escudoAcoes(kit) → as ações. kit: {
     D          a coleção "documentos" (pegar, gravar, apagar, todas)
     membros()  quem está na mesa: [{ usuario_id, nome, cargo, papel }]
     subir(blob) → promessa da url (a imagem do handout com as áreas escondidas cobertas)
     jogar(id, op, mudas, prova) → promessa (um lance num puzzle: a dica e a letra que o mestre dá)
     bancoOk()  o banco tem o Escudo (a 0025): "só para alguns" e os puzzles
   }
   Nada aqui pergunta nada a ninguém: quem chama confirma antes, e recebe o "antes" para o Desfazer (foto/voltar). */
(() => {
  'use strict';
  const E = window.TC && window.TC.escudo;
  const j = JSON.stringify;
  const copia = x => (x == null ? x : JSON.parse(JSON.stringify(x)));
  const agora = () => new Date().toISOString();

  function acoes(kit) {
    const D = kit.D;
    const bancoOk = () => !!(kit.bancoOk && kit.bancoOk());
    const linhaViva = id => { const l = D.pegar(id); return l && !l.apagado ? l : null; };
    const dadosDe = id => { const l = linhaViva(id); return l ? l.dados : null; };
    const lista = pre => D.todas().filter(l => !l.apagado && typeof l.id === 'string' && l.id.startsWith(pre) && E.idOk(l.id.slice(pre.length)));
    function sessoes() { return lista(E.PRE.sessao).map(l => ({ id: l.id.slice(E.PRE.sessao.length), s: E.normSessao(l.dados) })).sort((a, b) => a.s.n - b.s.n); }
    function relogios() {
      return lista(E.PRE.relogio).map(l => ({ id: l.id.slice(E.PRE.relogio.length), r: E.normRelogio(l.dados) }))
        .sort((a, b) => a.r.ordem - b.r.ordem || a.r.nome.localeCompare(b.r.nome, 'pt-BR'));
    }
    function handouts() {
      return lista(E.PRE.handout).map(l => ({ id: l.id.slice(E.PRE.handout.length), h: E.normHandout(l.dados), raw: l.dados }))
        .sort((a, b) => a.h.ordem - b.h.ordem || a.h.nome.localeCompare(b.h.nome, 'pt-BR'));
    }
    const sessao = id => { const d = dadosDe(E.PRE.sessao + id); return d ? E.normSessao(d) : null; };
    const relogio = id => { const d = dadosDe(E.PRE.relogio + id); return d ? E.normRelogio(d) : null; };
    const handout = id => { const d = dadosDe(E.PRE.handout + id); return d ? E.normHandout(d) : null; };
    // (a imagem já coberta, guardada no handout: a chave diz de que imagem e de que áreas ela é)
    const imgPubDe = id => { const d = dadosDe(E.PRE.handout + id); return d && d.imgPub && typeof d.imgPub.k === 'string' && E.urlOk(d.imgPub.url) ? d.imgPub : null; };
    // gravar um documento do mestre (nasce só de quem mestra)
    function gravar(id, dados, extra) {
      const campos = Object.assign({ dados: copia(dados) }, extra || {});
      if (!D.pegar(id) || D.pegar(id).apagado) { if (!campos.vis) campos.vis = 'mestre'; }
      D.gravar(id, campos);
    }
    const gravarSessao = (id, s) => gravar(E.PRE.sessao + id, E.normSessao(s));
    const gravarRelogio = (id, r) => { const antes = relogio(id); gravar(E.PRE.relogio + id, E.normRelogio(r)); projetarVista(E.normRelogio(r).camp); if (antes && antes.camp !== E.normRelogio(r).camp) projetarVista(antes.camp); };
    function gravarHandout(id, h, extra) {
      const d = Object.assign(E.normHandout(h), extra || {});
      const pub = extra && 'imgPub' in extra ? extra.imgPub : imgPubDe(id);
      if (pub) d.imgPub = pub; else delete d.imgPub;
      gravar(E.PRE.handout + id, d);
    }

    /* ---- o Desfazer: a foto dos documentos antes, e voltar a ela ---- */
    function foto(ids) {
      return [...new Set(ids)].map(id => { const l = linhaViva(id); return { id, l: l ? { dados: copia(l.dados), vis: l.vis, para: l.para == null ? null : l.para.slice() } : null }; });
    }
    function voltar(f) {
      for (const x of f) {
        if (!x.l) { if (linhaViva(x.id)) D.apagar(x.id); continue; }
        const c = { dados: x.l.dados, vis: x.l.vis };
        if (bancoOk()) c.para = x.l.para;
        D.gravar(x.id, c);
      }
      sincronizarVistas();
    }

    /* ---- relógios ---- */
    function projetarVista(camp) {
      const id = E.idVista(camp), v = E.vistaDe(relogios(), camp), atual = dadosDe(id);
      if (!atual && !v.relogios.length) return;
      if (atual && j(E.normVista(atual)) === j(v)) return;
      D.gravar(id, Object.assign({ dados: v }, linhaViva(id) ? {} : { vis: 'mesa' }));
    }
    function sincronizarVistas() {
      const camps = new Set([null]);
      for (const x of relogios()) camps.add(x.r.camp || null);
      for (const l of D.todas()) if (!l.apagado && typeof l.id === 'string' && l.id.startsWith(E.PRE.vista)) { const i = l.id.indexOf('@'); camps.add(i > 0 ? l.id.slice(i + 1) : null); }
      for (const c of camps) projetarVista(c);
    }
    // → { antes, r, encheu } (ou null)
    function avancarRelogio(id, n) {
      const r = relogio(id);
      if (!r) return null;
      const res = E.avancar(r, n);
      if (res.r.cheio === res.antes) return res;
      gravarRelogio(id, res.r);
      return res;
    }
    function relogioNovo(campos) {
      const id = E.novoId('rl');
      const ordem = relogios().reduce((m, x) => Math.max(m, x.r.ordem), 0) + 1;
      gravarRelogio(id, Object.assign({ nome: 'Relógio novo', gomos: 6, ordem }, campos || {}));
      return id;
    }
    function apagarRelogio(id) { const r = relogio(id); if (!r) return; D.apagar(E.PRE.relogio + id); projetarVista(r.camp); }

    /* ---- sessões ---- */
    function sessaoAberta(camp) {
      const l = sessoes().filter(x => x.s.estado === 'aberta');
      return l.find(x => (x.s.camp || null) === (camp || null)) || (camp === undefined ? l[0] : null) || null;
    }
    function logar(t, txt, camp) {
      const x = sessaoAberta(camp) || sessaoAberta();
      if (!x) return;
      x.s.log.push({ em: agora(), t, txt: String(txt).slice(0, 240) });
      gravarSessao(x.id, x.s);
    }
    function sessaoNova(camp, nome) {
      const id = E.novoId('ss'), n = E.proximoNumero(sessoes(), camp);
      const s = E.sessaoNova(n, camp);
      if (nome) s.nome = nome;
      gravarSessao(id, s);
      return id;
    }
    function abrirSessao(id) {
      const s = sessao(id);
      if (!s) return;
      const rel = {};
      for (const x of relogios()) if ((x.r.camp || null) === (s.camp || null) || !x.r.camp) rel[x.id] = x.r.cheio;
      s.estado = 'aberta'; s.inicio = { em: agora(), relogios: rel }; s.fim = null;
      gravarSessao(id, s);
    }
    /* Fechar: o resumo (com o que ficou para depois), e os passos escolhidos passam para a próxima sessão planejada (ou
       uma nova). → o id da sessão que recebeu os passos (ou null) */
    function fecharSessao(id, levar) {
      const s = sessao(id);
      if (!s) return null;
      s.estado = 'fechada'; s.fim = { em: agora() };
      s.resumo = E.resumoDaSessao(s, relogios());
      const ids = new Set(levar || []), vao = s.passos.filter(p => !p.feito && ids.has(p.id));
      let destino = null;
      if (vao.length) {
        const prox = E.proximaPlanejada(sessoes(), s.camp, id);
        destino = prox ? prox.id : sessaoNova(s.camp);
        const d = sessao(destino);
        d.passos = vao.map(p => Object.assign({}, p, { id: E.novoId('ps') })).concat(d.passos).slice(0, E.LIM.passos);
        gravarSessao(destino, d);
        s.passos = s.passos.filter(p => !vao.includes(p));
      }
      gravarSessao(id, s);
      return destino;
    }

    /* ---- handouts ---- */
    const quemRecebe = para => (para === 'mesa' ? 'a mesa' : (para || []).map(u => { const m = (kit.membros() || []).find(x => x.usuario_id === u); return m ? m.nome : 'alguém'; }).join(', '));
    function chaveImg(h) { const oc = h.areas.filter(a => !a.rev).map(a => [a.x, a.y, a.w, a.h]); return oc.length && h.img ? E.md5(h.img + j(oc)) : ''; }
    // a imagem como os jogadores a veem: com as áreas escondidas cobertas (sobe uma vez para cada jeito de cobrir)
    async function imagemPublica(id, h) {
      if (!h.img) return null;
      const k = chaveImg(h);
      if (!k) return h.img;
      const pub = imgPubDe(id);
      if (pub && pub.k === k) return pub.url;
      const url = await cobrir(h.img, h.areas.filter(a => !a.rev));
      gravarHandout(id, h, { imgPub: { k, url } });
      return url;
    }
    async function cobrir(url, areas) {
      const img = await new Promise((ok, falha) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = () => falha(new Error('Não deu para abrir a imagem do handout.')); i.src = url; });
      const k = Math.min(1, 1600 / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
      const w = Math.max(1, Math.round(img.naturalWidth * k)), hh = Math.max(1, Math.round(img.naturalHeight * k));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = hh;
      const g = cv.getContext('2d');
      g.drawImage(img, 0, 0, w, hh);
      for (const a of areas) {
        const x = a.x * w, y = a.y * hh, aw = a.w * w, ah = a.h * hh, r = Math.min(aw, ah) * 0.12;
        g.save();
        g.beginPath();
        g.moveTo(x + r, y); g.arcTo(x + aw, y, x + aw, y + ah, r); g.arcTo(x + aw, y + ah, x, y + ah, r); g.arcTo(x, y + ah, x, y, r); g.arcTo(x, y, x + aw, y, r); g.closePath();
        const gr = g.createLinearGradient(x, y, x + aw, y + ah); gr.addColorStop(0, '#2b241c'); gr.addColorStop(1, '#1c1813');
        g.fillStyle = gr; g.fill();
        g.clip();
        g.strokeStyle = 'rgba(214, 190, 150, .08)'; g.lineWidth = 1;
        for (let t = -ah; t < aw; t += 7) { g.beginPath(); g.moveTo(x + t, y + ah); g.lineTo(x + t + ah, y); g.stroke(); }
        g.fillStyle = 'rgba(214, 190, 150, .35)'; g.font = '600 ' + Math.max(12, Math.min(aw, ah) * 0.45) + 'px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('?', x + aw / 2, y + ah / 2);
        g.restore();
      }
      let blob;
      try { blob = await new Promise((ok, falha) => cv.toBlob(b => (b ? ok(b) : falha(new Error('vazio'))), 'image/jpeg', 0.88)); }
      catch (e) { throw new Error('Esta imagem não deixa cobrir as áreas escondidas (ela vem de outro site). Use “Trocar a imagem” e suba o arquivo.'); }
      return kit.subir(blob);
    }
    function pistaDoHandout(id, h) { const l = linhaViva(E.idPista(id, h.camp)); return l ? E.normPista(l.dados) : null; }
    // o que os jogadores têm é a versão de agora? (o texto, a imagem, o que está escondido)
    function versaoNova(id, h) {
      if (!h.entregue) return false;
      const p = pistaDoHandout(id, h);
      if (!p) return true;
      const k = chaveImg(h), pub = imgPubDe(id);
      const img = !h.img ? null : k ? (pub && pub.k === k ? pub.url : '?') : h.img;
      const novo = E.normPista(E.projetarHandout(id, h, img, p.em));
      const sem_ = x => j(Object.assign({}, x, { em: null, ver: 0 }));
      return sem_(novo) !== sem_(p) || img === '?';
    }
    const visPara = para => (para === 'mesa' ? { vis: 'mesa', para: null } : { vis: 'mestre', para });
    /* Entregar (à mesa ou a alguns) — ou mandar a versão nova a quem já tem. Puzzle: o jogo vai junto (novo, se ainda
       não existia; se já existia, continua de onde estava). → o "antes" (para o Desfazer) */
    async function entregar(id, para) {
      let h = handout(id);
      if (!h) throw new Error('Este handout não existe mais.');
      para = E.normPara(para || (h.entregue && h.entregue.para) || 'mesa');
      if (!para) throw new Error('Escolha para quem entregar.');
      if ((para !== 'mesa' || h.tipo === 'puzzle') && !bancoOk()) throw new Error(h.tipo === 'puzzle' ? 'Para entregar puzzles, falta aplicar a atualização do banco (o SQL 0025).' : 'Para entregar só a alguns, falta aplicar a atualização do banco (o SQL 0025).');
      if (h.tipo === 'puzzle' && h.puzzle.tipo === 'imagem' && !h.img) throw new Error('O quebra-cabeça precisa de uma imagem.');
      const idP = E.idPista(id, h.camp), idJ = E.idJogo(id, h.camp);
      const antes = foto([E.PRE.handout + id, idP, idJ]);
      const img = E.imagemEhPuzzle(h) ? null : await imagemPublica(id, h);
      h = handout(id);                                             // (a imagem coberta ficou guardada nele)
      const p0 = pistaDoHandout(id, h);
      const em = p0 && p0.em ? p0.em : agora();
      const vp = visPara(para);
      const campos = { dados: E.projetarHandout(id, h, img, em), vis: vp.vis };
      if (bancoOk()) campos.para = vp.para;
      D.gravar(idP, campos);
      if (h.tipo === 'puzzle') {
        const jl = linhaViva(idJ);
        if (!jl) {
          const jg = E.jogoNovo(id, h, h.img);
          const cj = { dados: jg, vis: vp.vis }; if (bancoOk()) cj.para = vp.para;
          D.gravar(idJ, cj);
          h.resultado = { acertoFeito: false, errosVistos: 0 };
        } else {
          const cj = { vis: vp.vis }; if (bancoOk()) cj.para = vp.para;
          if (jl.vis !== cj.vis || j(jl.para || null) !== j(cj.para || null)) D.gravar(idJ, cj);
        }
      }
      const novo = !h.entregue || j(h.entregue.para) !== j(para);
      h.entregue = { para, em: (h.entregue && h.entregue.em) || agora(), ver: h.ver };
      gravarHandout(id, h);
      logar(novo ? 'entregou' : 'revelou', novo ? h.nome + ' (' + quemRecebe(para) + ')' : h.nome + ': versão nova', h.camp);
      return antes;
    }
    // revelar (quais = { trechos, areas }; null = tudo) — e, entregue, os jogadores recebem já
    async function revelar(id, quais, esconder) {
      const h = handout(id);
      if (!h) return null;
      const antes = foto([E.PRE.handout + id, E.idPista(id, h.camp)]);
      const tr = E.trechos(h.texto).map(t => t.k);
      const alvoT = quais && Array.isArray(quais.trechos) ? quais.trechos : quais ? [] : tr;
      const alvoA = quais && Array.isArray(quais.areas) ? quais.areas : quais ? [] : h.areas.map(a => a.id);
      if (esconder) { h.revelados = h.revelados.filter(k => !alvoT.includes(k)); for (const a of h.areas) if (alvoA.includes(a.id)) a.rev = false; }
      else { h.revelados = [...new Set(h.revelados.concat(alvoT.filter(k => tr.includes(k))))]; for (const a of h.areas) if (alvoA.includes(a.id)) a.rev = true; }
      gravarHandout(id, h);
      if (h.entregue) {
        const img = E.imagemEhPuzzle(h) ? null : await imagemPublica(id, h);
        const h2 = handout(id), p0 = pistaDoHandout(id, h2);
        D.gravar(E.idPista(id, h2.camp), { dados: E.projetarHandout(id, h2, img, p0 && p0.em ? p0.em : agora()) });
        if (!esconder) logar('revelou', h2.nome + ': ' + (quais ? 'um pedaço revelado' : 'tudo revelado'), h2.camp);
      }
      return antes;
    }
    // tirar dos jogadores (a pista e o puzzle somem para eles; o handout fica com o mestre)
    function recolher(id) {
      const h = handout(id);
      if (!h) return null;
      const idP = E.idPista(id, h.camp), idJ = E.idJogo(id, h.camp);
      const antes = foto([E.PRE.handout + id, idP, idJ]);
      if (linhaViva(idP)) D.apagar(idP);
      if (linhaViva(idJ)) D.apagar(idJ);
      h.entregue = null;
      gravarHandout(id, h);
      return antes;
    }
    // o puzzle volta ao começo (o mesmo desenho; sem erros, sem ninguém ter resolvido)
    function reiniciar(id) {
      const h = handout(id);
      if (!h || h.tipo !== 'puzzle') return null;
      const idJ = E.idJogo(id, h.camp);
      const antes = foto([E.PRE.handout + id, idJ]);
      if (h.entregue) D.gravar(idJ, { dados: E.jogoNovo(id, h, h.img) });
      h.resultado = { acertoFeito: false, errosVistos: 0 };
      gravarHandout(id, h);
      return antes;
    }
    function jogoDe(id, h) { h = h || handout(id); if (!h) return null; const l = linhaViva(E.idJogo(id, h.camp)); return l ? E.normJogo(l.dados) : null; }
    // a charada: a próxima dica; a cifra: mais uma letra (as duas, pelo banco, como um lance do mestre)
    async function darDica(id) {
      const h = handout(id), jg = jogoDe(id, h);
      if (!h || !jg || jg.resolvido) return null;
      const m = E.montarPuzzle(h.puzzle, h.img);
      if (jg.tipo === 'charada') {
        const ja = Array.isArray(jg.estado.dicas) ? jg.estado.dicas : [];
        if (ja.length >= m.dicas.length) return null;
        await kit.jogar(E.idJogo(id, h.camp), 'jogar', { dicas: ja.concat(m.dicas[ja.length]), _txt: 'o mestre deu uma dica' });
        return m.dicas[ja.length];
      }
      if (jg.tipo === 'cifra') {
        const letras = m.letras || {};
        const falta = Object.keys(letras).map(Number).filter(i => !(i in jg.pub.dadas) && jg.estado['d' + i] !== letras[i]);
        if (!falta.length) return null;
        const i = falta.find(x => jg.estado['c' + x] !== letras[x]) ?? falta[0];
        await kit.jogar(E.idJogo(id, h.camp), 'jogar', { ['d' + i]: letras[i], _txt: 'o mestre revelou uma letra' });
        return letras[i];
      }
      // (lote 46) os puzzles novos: cada um sabe a dica que dá
      const d = E.dicaDe && E.dicaDe(jg, m);
      if (d) { await kit.jogar(E.idJogo(id, h.camp), 'jogar', Object.assign({}, d.mudas, { _txt: 'o mestre deu uma dica' })); return d.txt; }
      return null;
    }
    // (lote 46) o cronômetro: mais tempo (em segundos) — o puzzle destrava, se tinha acabado
    async function maisTempo(id, seg) {
      const h = handout(id), jg = jogoDe(id, h);
      if (!h || !jg || jg.resolvido || !jg.tempo) return null;
      const pr = E.prazo(jg), t0 = Date.parse(jg.estado.t0);
      if (!pr || !Number.isFinite(t0)) return null;
      // (acabado, o tempo novo conta de agora; senão, soma ao que falta)
      const novoFim = (pr.acabou ? Date.now() : pr.fim) + Math.max(30, Math.round(seg || 120)) * 1000;
      const mais = Math.min(36000, Math.max(0, Math.round((novoFim - t0) / 1000 - jg.tempo)));
      await kit.jogar(E.idJogo(id, h.camp), 'jogar', { mais, fim: null, _txt: 'o mestre deu mais tempo' });
      return mais;
    }
    function handoutNovo(tipo, campos) {
      const id = E.novoId('ho');
      const ordem = handouts().reduce((m, x) => Math.max(m, x.h.ordem), 0) + 1;
      const base = { tipo, ordem, nome: tipo === 'imagem' ? 'Imagem nova' : tipo === 'puzzle' ? 'Puzzle novo' : 'Carta nova' };
      if (tipo === 'puzzle') base.puzzle = { tipo: 'charada', dif: 'facil', seed: E.novaSemente(), idx: E.sortearCharada('facil', E.mulberry(E.novaSemente())) };
      gravarHandout(id, Object.assign(base, campos || {}));
      return id;
    }
    function apagarHandout(id) {
      const h = handout(id);
      if (!h) return null;
      const ids = [E.PRE.handout + id, E.idPista(id, h.camp), E.idJogo(id, h.camp)];
      const antes = foto(ids);
      for (const x of ids) if (linhaViva(x)) D.apagar(x);
      return antes;
    }

    /* ---- o vigia: o que acontece quando os jogadores resolvem ou erram um puzzle ----
       Roda na casca do mestre da mesa (só nele: o auxiliar não, para não fazer duas vezes). → os avisos: [{ txt, antes,
       consequencia }] — quem chama mostra (com o Desfazer). */
    let ocupado = false;
    async function processar() {
      if (ocupado) return [];
      ocupado = true;
      const avisos = [];
      try {
        for (const { id, h } of handouts()) {
          if (h.tipo !== 'puzzle' || !h.entregue) continue;
          const jg = jogoDe(id, h);
          if (!jg) continue;
          // (lote 46) o cronômetro acabou: conta um erro (uma vez) e o puzzle trava até o mestre dar mais tempo
          const pr = E.prazo && E.prazo(jg);
          if (pr && pr.acabou && !jg.resolvido && jg.estado.fim !== 1) {
            try { await kit.jogar(E.idJogo(id, h.camp), 'errar', { fim: 1, _txt: 'deixou o tempo acabar' }); } catch (e) { /* (tenta de novo na próxima volta) */ }
            continue;
          }
          if (jg.erros > h.resultado.errosVistos) {
            const novos = jg.erros - h.resultado.errosVistos;
            const ids = [E.PRE.handout + id];
            const er = h.liga.erro && relogio(h.liga.erro.relogio) ? h.liga.erro : null;
            if (er) ids.push(E.PRE.relogio + er.relogio);
            const antes = foto(ids);
            h.resultado.errosVistos = jg.erros;
            gravarHandout(id, h);
            if (er) {
              const r = avancarRelogio(er.relogio, novos * er.gomos);
              if (r) avisos.push({ txt: 'Erraram “' + h.nome + '”: o relógio ' + r.r.nome + ' andou (' + r.antes + ' → ' + r.r.cheio + ' de ' + r.r.gomos + ').', antes, consequencia: r.encheu ? r.r.nome + ' encheu' + (r.r.consequencia ? ': ' + r.r.consequencia : '.') : null });
            }
          }
          if (jg.resolvido && !h.resultado.acertoFeito) {
            const ids = [E.PRE.handout + id];
            for (const a of h.liga.acerto) { const ha = handout(a.h); if (ha) ids.push(E.PRE.handout + a.h, E.idPista(a.h, ha.camp), E.idJogo(a.h, ha.camp)); }
            const antes = foto(ids);
            const h1 = handout(id);
            h1.resultado.acertoFeito = true;
            gravarHandout(id, h1);
            const feitos = [];
            for (const a of h.liga.acerto) {
              const ha = handout(a.h);
              if (!ha) continue;
              try {
                if (a.k === 'entregar') { await entregar(a.h, ha.entregue ? ha.entregue.para : h.entregue.para); feitos.push('entregou “' + ha.nome + '”'); }
                else if (a.k === 'revelar') { await revelar(a.h, a.trechos || a.areas ? { trechos: a.trechos || [], areas: a.areas || [] } : null); feitos.push('revelou ' + (a.trechos || a.areas ? 'parte de' : '') + ' “' + ha.nome + '”'); }
              } catch (e) { avisos.push({ txt: 'Não deu para ' + (a.k === 'entregar' ? 'entregar' : 'revelar') + ' “' + ha.nome + '”: ' + ((e && e.message) || 'erro') }); }
            }
            const quem = (kit.membros() || []).find(m => m.usuario_id === jg.resolvido.por);
            logar('puzzle', h.nome + ': resolvido' + (quem ? ' por ' + quem.nome : ''), h.camp);
            avisos.push({ txt: (quem ? quem.nome : 'Alguém') + ' resolveu “' + h.nome + '”' + (feitos.length ? ': ' + feitos.join(', ') + '.' : '.'), antes });
          }
        }
      } finally { ocupado = false; }
      return avisos;
    }

    return {
      D, sessoes, relogios, handouts, sessao, relogio, handout, dadosDe, linhaViva,
      gravar, gravarSessao, gravarRelogio, gravarHandout, foto, voltar,
      projetarVista, sincronizarVistas, avancarRelogio, relogioNovo, apagarRelogio,
      sessaoAberta, logar, sessaoNova, abrirSessao, fecharSessao,
      quemRecebe, imagemPublica, versaoNova, pistaDoHandout, entregar, revelar, recolher, reiniciar, jogoDe, darDica, maisTempo, handoutNovo, apagarHandout,
      processar,
    };
  }
  window.TC = window.TC || {};
  window.TC.escudoAcoes = acoes;
})();
