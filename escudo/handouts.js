/* Tiny Cats · Escudo do mestre (lote 31): os handouts e os puzzles.
   A lista à esquerda (imagens, cartas e puzzles) e, à direita, o handout aberto: o que ele é (a imagem com as áreas
   escondidas, desenhadas arrastando; a carta com os trechos escondidos entre {{ e }}; o puzzle sorteado, com a
   dificuldade) e, ao lado, a prévia de como os jogadores vão ver — no puzzle, um teste jogável, com a resposta para o
   mestre. Embaixo, entregar (à mesa ou só a alguns) e, depois, o que está com os jogadores: revelar aos poucos, mandar
   a versão nova, dar uma dica, recomeçar, tirar dos jogadores. No puzzle, o que acontece ao acertar (revelar parte de
   outro handout, entregar outro) e ao errar (um relógio anda). Para a página, window.EscudoHandouts(kit). */
(() => {
  'use strict';
  window.EscudoHandouts = function (k) {
    const { E, U, PUI, A, J, toast } = k;
    const { h, icone } = U;
    const j = JSON.stringify;
    const copia = x => (x == null ? x : JSON.parse(JSON.stringify(x)));
    const ICO = {
      imagem: 'M4 5h16v14H4zM4 15l4.5-4.5 4 4 2.5-2.5L20 17M15.5 9.5a1.5 1.5 0 1 0 0-.01',
      carta: 'M5 3.5h10l4 4V20.5H5zM15 3.5v4h4M8 11h8M8 14.5h8M8 18h5',
      puzzle: 'M9 3.5h3a2 2 0 1 1 4 0h3v5a2 2 0 1 0 0 4v5h-5a2 2 0 1 1-4 0H5v-5a2 2 0 1 0 0-4v-5z',
    };
    let sel = U.guarda.ler('tinycats:escudo:handout') || null, filtro = 'todos';
    const testes = {};                                     // o teste de cada puzzle: { chave, jogo, sel }
    let selPeca = null;                                    // a peça escolhida no quebra-cabeça dos jogadores (vendo)
    const H = id => E.PRE.handout + id;
    function selecionar(id) { sel = id; U.guarda.gravar('tinycats:escudo:handout', id); }

    /* ---------------- mudar ---------------- */
    function mudarH(hid, rotulo, fn, chaveTexto) {
      const faz = () => { const x = A.handout(hid); if (!x) return; fn(x); A.gravarHandout(hid, x); };
      if (chaveTexto) { k.mudarTexto(chaveTexto, rotulo, [H(hid)], faz); return; }
      k.mudar(rotulo, [H(hid)], faz);
    }
    async function comFoto(rotulo, promessa, aviso) {
      try { const f = await promessa; if (f) k.empilhar(rotulo, f); k.pintar(); if (aviso) k.avisoDesfazer(aviso); return true; }
      catch (e) { toast((e && e.message) || 'Não deu certo agora.'); k.pintar(); return false; }
    }
    function novo(tipo) {
      let id;
      k.mudar('criar um handout', [], () => { id = A.handoutNovo(tipo, { camp: k.campVista() }); });
      selecionar(id);
      k.pintar();
      setTimeout(() => { const i = document.querySelector('[data-k="h:nome"]'); if (i) { i.focus(); i.select(); } }, 30);
      return id;
    }
    // (a foto do "criar" não tem o documento; o Desfazer apaga)
    function novoComDesfazer(tipo) { const id = novo(tipo); const ult = k.ultimoPasso && k.ultimoPasso(); if (ult) ult.f.push({ id: H(id), l: null }); return id; }

    /* ---------------- entregar ---------------- */
    function jogadoresPara(x) {
      const l = k.jogadores();
      return x.camp && k.temCampanhas() ? l.filter(m => !Array.isArray(m.campanhas) || m.campanhas.includes(x.camp)) : l;
    }
    function entregarDlg(hid) {
      const x = A.handout(hid);
      if (!x) return;
      if (!k.naMesa()) { toast('Numa mesa, os handouts vão para os jogadores. Aqui, fora de uma mesa, dá para montar e testar.'); return; }
      if (x.tipo === 'puzzle' && k.bancoOk() !== true) { toast('Para entregar puzzles, falta aplicar a atualização do banco (o SQL 0025).'); return; }
      const js = jogadoresPara(x), ja = x.entregue && Array.isArray(x.entregue.para) ? x.entregue.para : [];
      let modo = x.entregue && Array.isArray(x.entregue.para) ? 'alguns' : 'mesa';
      const caixas = js.map(m => h('input', { type: 'checkbox', 'data-k': 'en:' + m.usuario_id, 'data-u': m.usuario_id, checked: ja.includes(m.usuario_id) ? true : null }));
      const corpo = h('div', { class: 'corpo' });
      const pintarDlg = () => U.trocar(corpo,
        h('label', { class: 'chk' }, h('input', { type: 'radio', name: 'en', 'data-k': 'en:mesa', checked: modo === 'mesa' ? true : null, onchange: () => { modo = 'mesa'; pintarDlg(); } }),
          h('span', { text: 'A mesa toda' + (x.camp && k.temCampanhas() ? ' (quem joga ' + k.nomeCamp(x.camp) + ')' : '') })),
        h('label', { class: 'chk' + (k.bancoOk() !== true ? ' off' : '') }, h('input', { type: 'radio', name: 'en', 'data-k': 'en:alguns', disabled: k.bancoOk() !== true, checked: modo === 'alguns' ? true : null, onchange: () => { modo = 'alguns'; pintarDlg(); } }),
          h('span', { text: 'Só a alguns' + (k.bancoOk() !== true ? ' (precisa da atualização do banco, o SQL 0025)' : '') })),
        modo === 'alguns' ? (js.length ? h('div', { class: 'jogadores' }, js.map((m, i) => h('label', { class: 'chk' }, caixas[i], h('span', { text: m.nome })))) : h('p', { class: 'ajuda', text: 'Ninguém joga nesta mesa ainda.' })) : null,
        h('p', { class: 'ajuda', text: 'Quem recebe vê uma janela com o handout, e ele fica guardado na aba Pistas. Os trechos e as áreas escondidas aparecem cobertos até você revelar.' }));
      pintarDlg();
      const ok = h('button', { type: 'button', class: 'btn pri', 'data-k': 'en:ok' }, x.entregue ? 'Entregar' : 'Entregar agora');
      ok.onclick = async () => {
        const para = modo === 'mesa' ? 'mesa' : caixas.filter(c => c.checked).map(c => c.getAttribute('data-u'));
        if (para !== 'mesa' && !para.length) { toast('Marque quem recebe.'); return; }
        ok.disabled = true; ok.textContent = 'Entregando…';
        const deu = await comFoto('entregar ' + x.nome, A.entregar(hid, para));
        if (deu) { J.fechar(); k.avisoDesfazer('“' + x.nome + '” entregue a ' + A.quemRecebe(para) + '.'); }
        else { ok.disabled = false; ok.textContent = 'Entregar'; }
      };
      J.abrir('', [h('h2', { text: 'Entregar “' + x.nome + '”' }), corpo, J.pe(h('button', { type: 'button', class: 'btn', 'data-k': 'en:cancelar', onclick: () => J.fechar() }, 'Cancelar'), ok)]);
    }

    /* ---------------- a imagem e as áreas escondidas ---------------- */
    async function escolherImagem(hid) {
      const inp = document.getElementById('arquivo');
      inp.value = '';
      inp.onchange = async () => {
        const arq = inp.files && inp.files[0];
        if (!arq) return;
        const salvo = document.getElementById('salvo');
        salvo.textContent = 'Enviando a imagem…';
        try {
          const r = await k.subirImagem(arq);
          mudarH(hid, 'trocar a imagem', x => { x.img = r.url; x.imgAr = r.ar; x.areas = []; });
        } catch (e) { toast((e && e.message) || 'Não deu para usar esta imagem.'); }
        salvo.textContent = '';
      };
      inp.click();
    }
    function imagemComAreas(hid, x, editavel) {
      // (a imagem num tamanho bom de mexer, pequena ou grande: a largura sai da proporção dela)
      const larg = Math.round(Math.min(560, 420 * (x.imgAr || 1)));
      const caixa = h('div', { class: 'img-ed', 'data-k': 'h:img-ed', style: { width: 'min(100%, ' + larg + 'px)' } },
        h('img', { src: x.img, alt: x.legenda || x.nome, draggable: 'false' }),
        x.areas.map((a, i) => h('div', { class: 'area' + (a.rev ? ' rev' : ''), 'data-k': 'h:area:' + a.id, title: (a.rev ? 'Área ' + (i + 1) + ' (revelada)' : 'Área ' + (i + 1) + ' (escondida)'),
          style: { left: a.x * 100 + '%', top: a.y * 100 + '%', width: a.w * 100 + '%', height: a.h * 100 + '%' } }, String(i + 1))));
      if (!editavel) return caixa;
      // (o elemento da tela é o que recebeu o clique: ao pintar por cima, o que fica é o antigo, com este ouvinte)
      caixa.onpointerdown = ev => {
        if (ev.button !== 0 || ev.target.closest('.area')) return;
        const vivo = ev.currentTarget, r = vivo.getBoundingClientRect();
        if (!r.width || !r.height) return;
        ev.preventDefault();
        const x0 = (ev.clientX - r.left) / r.width, y0 = (ev.clientY - r.top) / r.height;
        const nova = h('div', { class: 'area nova' });
        vivo.append(nova);
        let caixaNova = { x: x0, y: y0, w: 0, h: 0 };
        const mover = e2 => {
          const x1 = Math.max(0, Math.min(1, (e2.clientX - r.left) / r.width)), y1 = Math.max(0, Math.min(1, (e2.clientY - r.top) / r.height));
          caixaNova = { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) };
          Object.assign(nova.style, { left: caixaNova.x * 100 + '%', top: caixaNova.y * 100 + '%', width: caixaNova.w * 100 + '%', height: caixaNova.h * 100 + '%' });
        };
        const soltar = () => {
          window.removeEventListener('pointermove', mover); window.removeEventListener('pointerup', soltar);
          nova.remove();
          if (caixaNova.w < 0.02 || caixaNova.h < 0.02) return;
          if (x0 == null) return;
          const xx = A.handout(hid);
          if (!xx || xx.areas.length >= E.LIM.areas) { toast('Até ' + E.LIM.areas + ' áreas por imagem.'); return; }
          mudarH(hid, 'esconder uma área', y => { y.areas.push(E.normArea(caixaNova, new Set(y.areas.map(a => a.id)))); });
          const hh = A.handout(hid);
          if (hh && hh.entregue) toast('A área nova fica escondida para os jogadores quando você mandar a versão nova.');
        };
        window.addEventListener('pointermove', mover); window.addEventListener('pointerup', soltar);
      };
      return caixa;
    }
    async function revelarUm(hid, quais, esconder) {
      const x = A.handout(hid);
      const rot = (esconder ? 'esconder de novo ' : 'revelar ') + (quais ? 'um pedaço de ' : '') + x.nome;
      await comFoto(rot, A.revelar(hid, quais, esconder), x.entregue ? (esconder ? 'Escondido de novo para os jogadores.' : 'Revelado aos jogadores.') : null);
    }

    /* ---------------- a prévia ---------------- */
    function previaHandout(hid, x) {
      const p = E.projetarHandout(hid, x, x.tipo === 'puzzle' && x.puzzle.tipo === 'imagem' ? null : x.img, null);
      const el = PUI.handout(p, {});
      // (na prévia, a imagem original com as áreas escondidas por cima; aos jogadores vai a imagem já coberta)
      const fig = el.querySelector('.ho-fig img');
      if (fig && x.areas.some(a => !a.rev)) {
        const cx = h('div', { class: 'img-ed' });
        fig.replaceWith(cx); cx.append(fig);
        for (const a of x.areas) if (!a.rev) cx.append(h('div', { class: 'area', style: { left: a.x * 100 + '%', top: a.y * 100 + '%', width: a.w * 100 + '%', height: a.h * 100 + '%', borderStyle: 'solid', background: '#231d16', color: '#7a6a52' } }, '?'));
      }
      return el;
    }
    function teste(hid, x) {
      const chave = j(x.puzzle) + '|' + (x.img || '') + '|' + x.imgAr;
      let t = testes[hid];
      if (!t || t.chave !== chave) t = testes[hid] = { chave, jogo: E.jogoNovo(hid, x, x.img), sel: null };
      if (x.puzzle.tipo === 'imagem' && !x.img) return h('p', { class: 'ajuda', text: 'Escolha a imagem do quebra-cabeça.' });
      if (!t.jogo) return h('p', { class: 'ajuda', text: 'Este puzzle não abriu.' });
      const ctx = {
        chave: 'tst:', mestre: true, eu: null,
        quem: () => 'Você (no teste)',
        sel: t.sel, escolher: i => { t.sel = i; k.pintar(); },
        resposta: PUI.respostaEmPalavras(x),
        aviso: toast,
        jogar: (op, mudas, prova) => {
          const jg = t.jogo;
          if (jg.resolvido) return Promise.reject(new Error('Já resolvido (no teste).'));
          const est = Object.assign({}, jg.estado);
          for (const kk of Object.keys(mudas)) { if (kk === '_txt') continue; if (mudas[kk] === null) delete est[kk]; else est[kk] = mudas[kk]; }
          if (op === 'acertar' && !E.confere(jg, prova)) return Promise.reject(new Error('Ainda não é isso.'));
          t.jogo = Object.assign({}, jg, { estado: est, erros: jg.erros + (op === 'errar' ? 1 : 0), resolvido: op === 'acertar' ? { por: null, em: new Date().toISOString() } : null,
            ultimo: { por: null, em: new Date().toISOString(), txt: mudas._txt || '' } });
          if (op === 'errar') toast('Errou (no teste)' + (x.liga.erro && A.relogio(x.liga.erro.relogio) ? ': na mesa, o relógio ' + A.relogio(x.liga.erro.relogio).nome + ' andaria.' : '.'));
          if (op === 'acertar') toast('Resolvido (no teste)! Na mesa, ' + (x.liga.acerto.length ? 'aconteceria o que você ligou.' : 'você recebe o aviso.'));
          k.pintar();
          return Promise.resolve(t.jogo);
        },
      };
      return [PUI.puzzle(t.jogo, ctx), h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn sm', 'data-k': 'tst:recomecar', onclick: () => { delete testes[hid]; k.pintar(); } }, 'Recomeçar o teste'))];
    }

    /* ---------------- o puzzle: o que é e o que acontece ---------------- */
    function trocarPuzzle(hid, rotulo, fn) {
      const x = A.handout(hid);
      const faz = async () => {
        const ids = [H(hid), E.idPista(hid, x.camp), E.idJogo(hid, x.camp)];
        const f = A.foto(ids);
        const y = A.handout(hid); fn(y); A.gravarHandout(hid, y);
        delete testes[hid];
        if (y.entregue) { try { A.reiniciar(hid); await A.entregar(hid, y.entregue.para); } catch (e) { toast((e && e.message) || 'Não deu certo agora.'); } }
        k.empilhar(rotulo, f); k.pintar();
      };
      if (x && x.entregue) {
        J.confirmar('Trocar o puzzle?', 'Os jogadores já têm este puzzle: com a troca, eles recebem o novo, do começo.', 'Trocar').then(sim => { if (sim) faz(); });
        return;
      }
      faz();
    }
    function configPuzzle(hid, x) {
      const pz = x.puzzle, m = E.montarPuzzle(pz, x.img, x.imgAr);
      const grupos = {};
      for (const t of Object.keys(E.PUZZLES)) (grupos[E.PUZZLES[t].grupo] = grupos[E.PUZZLES[t].grupo] || []).push(t);
      const tipoNovo = t => trocarPuzzle(hid, 'trocar o tipo do puzzle', y => {
        y.puzzle = Object.assign({}, y.puzzle, { tipo: t, seed: E.novaSemente() });
        if (t === 'cifra' && !y.puzzle.msg) y.puzzle.msg = E.MENSAGENS[Math.floor(Math.random() * E.MENSAGENS.length)];
        if (t === 'charada') y.puzzle.idx = E.sortearCharada(y.puzzle.dif, E.mulberry(E.novaSemente()));
      });
      const partes = [
        h('div', { class: 'tipos-pz' }, Object.keys(grupos).map(g => h('div', { class: 'grp' }, h('span', { text: g }),
          h('div', { class: 'seg', role: 'group', 'aria-label': g }, grupos[g].map(t => h('button', { type: 'button', 'data-k': 'pz:t:' + t, 'aria-pressed': String(pz.tipo === t), title: E.PUZZLES[t].desc, onclick: () => { if (pz.tipo !== t) tipoNovo(t); } }, E.PUZZLES[t].nome)))))),
        h('div', { class: 'row' }, h('div', { class: 'seg', role: 'group', 'aria-label': 'Dificuldade' }, Object.keys(E.DIF).map(d => h('button', { type: 'button', 'data-k': 'pz:d:' + d, 'aria-pressed': String(pz.dif === d),
          onclick: () => { if (pz.dif !== d) trocarPuzzle(hid, 'mudar a dificuldade', y => { y.puzzle.dif = d; if (y.puzzle.tipo === 'charada' && !y.puzzle.propria) y.puzzle.idx = E.sortearCharada(d, E.mulberry(E.novaSemente())); }); } }, E.DIF[d]))),
          h('button', { type: 'button', class: 'btn sm', 'data-k': 'pz:sortear', title: 'Outro puzzle do mesmo tipo e da mesma dificuldade', onclick: () => trocarPuzzle(hid, 'sortear outro puzzle', y => { y.puzzle.seed = E.novaSemente(); if (y.puzzle.tipo === 'charada' && !y.puzzle.propria) y.puzzle.idx = E.sortearCharada(y.puzzle.dif, E.mulberry(E.novaSemente()), y.puzzle.idx); }) }, 'Sortear outro')),
      ];
      if (pz.tipo === 'cifra') {
        partes.push(h('div', { class: 'seg', role: 'group', 'aria-label': 'O jeito de cifrar' }, [['runas', 'Runas'], ['troca', 'Troca de letras'], ['cesar', 'César (andar no alfabeto)']].map(([v, n]) =>
          h('button', { type: 'button', 'data-k': 'pz:m:' + v, 'aria-pressed': String(pz.metodo === v), onclick: () => { if (pz.metodo !== v) trocarPuzzle(hid, 'mudar a cifra', y => { y.puzzle.metodo = v; }); } }, n))));
        partes.push(h('label', { class: 'field' }, h('span', { text: 'A mensagem' }),
          h('textarea', { class: 'in', rows: 2, 'data-k': 'pz:msg', value: pz.msg, maxlength: E.LIM.msg, placeholder: 'O que os jogadores vão decifrar…',
            onchange: ev => { const v = ev.target.value.trim(); if (v !== pz.msg) trocarPuzzle(hid, 'mudar a mensagem', y => { y.puzzle.msg = v; }); } })));
        partes.push(h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn sm', 'data-k': 'pz:msg-sortear', onclick: () => trocarPuzzle(hid, 'sortear a mensagem', y => { let v; do { v = E.MENSAGENS[Math.floor(Math.random() * E.MENSAGENS.length)]; } while (v === y.puzzle.msg && E.MENSAGENS.length > 1); y.puzzle.msg = v; }) }, 'Sortear uma mensagem'),
          h('button', { type: 'button', class: 'btn sm', 'data-k': 'pz:chave', title: 'Um handout novo com a chave (que símbolo é que letra): entregue quando quiser, ou esconda partes dele', onclick: () => criarChave(hid) }, 'Criar a chave como handout')));
        if (m && m.pub.dica) partes.push(h('p', { class: 'ajuda', text: 'Os jogadores recebem a dica: “' + m.pub.dica + '”' }));
      }
      if (pz.tipo === 'charada') {
        const ch = pz.propria || E.CHARADAS[pz.idx || 0];
        if (!pz.propria) {
          partes.push(h('div', { class: 'cartao' }, h('b', { text: ch.p }), h('span', { class: 'ajuda', text: 'Respostas aceitas: ' + ch.r.join(', ') }), h('span', { class: 'ajuda', text: 'Dicas (você dá quando quiser): ' + ch.d.join(' · ') })));
          partes.push(h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn sm', 'data-k': 'pz:propria', onclick: () => trocarPuzzle(hid, 'escrever a charada', y => { y.puzzle.propria = { p: ch.p, r: ch.r.slice(), d: ch.d.slice() }; }) }, 'Escrever a minha')));
        } else {
          partes.push(h('label', { class: 'field' }, h('span', { text: 'A charada' }), h('textarea', { class: 'in', rows: 2, 'data-k': 'pz:cp', value: ch.p, maxlength: 400, onchange: ev => trocarPuzzle(hid, 'mudar a charada', y => { y.puzzle.propria.p = ev.target.value.trim() || y.puzzle.propria.p; }) })));
          partes.push(h('label', { class: 'field' }, h('span', { text: 'As respostas aceitas (separadas por vírgula)' }), h('input', { class: 'in', 'data-k': 'pz:cr', value: ch.r.join(', '), onchange: ev => { const r = ev.target.value.split(',').map(s => s.trim()).filter(Boolean); if (!r.length) { toast('Escreva pelo menos uma resposta.'); k.pintar(); return; } trocarPuzzle(hid, 'mudar as respostas', y => { y.puzzle.propria.r = r; }); } })));
          partes.push(h('label', { class: 'field' }, h('span', { text: 'As dicas (uma por linha)' }), h('textarea', { class: 'in', rows: 2, 'data-k': 'pz:cd', value: ch.d.join('\n'), onchange: ev => trocarPuzzle(hid, 'mudar as dicas', y => { y.puzzle.propria.d = ev.target.value.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 4); }) })));
          partes.push(h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn sm', 'data-k': 'pz:banco', onclick: () => trocarPuzzle(hid, 'voltar ao banco de charadas', y => { y.puzzle.propria = null; y.puzzle.idx = E.sortearCharada(y.puzzle.dif, E.mulberry(E.novaSemente())); }) }, 'Sortear do banco de charadas')));
        }
      }
      if (pz.tipo === 'imagem') {
        partes.push(x.img ? h('div', { class: 'row' }, h('img', { src: x.img, alt: '', style: { maxWidth: '160px', maxHeight: '110px', borderRadius: '6px' } }), h('button', { type: 'button', class: 'btn sm', 'data-k': 'h:img', onclick: () => escolherImagem(hid) }, 'Trocar a imagem'))
          : h('button', { type: 'button', class: 'btn pri', 'data-k': 'h:img', onclick: () => escolherImagem(hid) }, 'Escolher a imagem'));
      }
      return h('div', { class: 'cartao' }, h('span', { class: 'sub', text: 'O puzzle' }), partes);
    }
    function criarChave(hid) {
      const x = A.handout(hid), m = x && E.montarPuzzle(x.puzzle, x.img);
      if (!m || !m.letras) return;
      const linhas = m.pub.simbolos.map((s, i) => s + ' = ' + m.letras[i]);
      const txt = (m.pub.metodo === 'cesar' && m.pub.dica ? m.pub.dica + '\n\n' : '') + linhas.join('\n');
      let id;
      k.mudar('criar a chave', [], () => { id = A.handoutNovo('carta', { nome: 'A chave de “' + x.nome + '”', papel: 'bilhete', texto: txt, camp: x.camp }); });
      const ult = k.ultimoPasso(); if (ult) ult.f.push({ id: H(id), l: null });
      k.avisoDesfazer('A chave virou um handout (uma carta). Entregue quando quiser, ou esconda partes dela com {{ e }}.');
    }
    function escolherHandout(titulo, menos, filtroFn) {
      return new Promise(resolve => {
        const l = A.handouts().filter(y => y.id !== menos && (!filtroFn || filtroFn(y)));
        let feito = false;
        const fim = v => { if (feito) return; feito = true; J.fechar(); resolve(v); };
        J.abrir('', [h('h2', { text: titulo }), l.length ? h('div', { class: 'escolha' }, h('div', { class: 'opcoes' }, l.map((y, i) => h('button', { type: 'button', 'data-k': 'eh:' + i, onclick: () => fim(y.id) }, h('b', { text: y.h.nome }), h('small', { text: E.TIPOS_HANDOUT[y.h.tipo] + (E.escondidos(y.h) ? ' · ' + E.escondidos(y.h) + ' escondido(s)' : '') })))))
          : h('p', { class: 'ajuda', text: 'Nenhum handout serve aqui ainda.' }), J.pe(h('button', { type: 'button', class: 'btn', 'data-k': 'eh:cancelar', onclick: () => fim(null) }, 'Cancelar'))], () => fim(null));
      });
    }
    async function addRevelar(hid) {
      const alvo = await escolherHandout('Ao acertar, revelar o que está escondido em…', hid, y => E.escondidos(y.h) > 0);
      if (!alvo) return;
      const y = A.handout(alvo);
      const tr = E.trechos(y.texto).filter(t => !y.revelados.includes(t.k)), ar = y.areas.filter(a => !a.rev);
      const cxT = tr.map(t => h('input', { type: 'checkbox', checked: true, 'data-t': t.k })), cxA = ar.map(a => h('input', { type: 'checkbox', checked: true, 'data-a': a.id }));
      J.abrir('', [h('h2', { text: 'O que revelar de “' + y.nome + '”' }),
        h('div', { class: 'jogadores', style: { paddingLeft: 0 } }, tr.map((t, i) => h('label', { class: 'chk' }, cxT[i], h('span', { text: '“' + t.txt + '”' }))), ar.map((a, i) => h('label', { class: 'chk' }, cxA[i], h('span', { text: 'A área ' + (y.areas.indexOf(a) + 1) + ' da imagem' })))),
        J.pe(h('button', { type: 'button', class: 'btn', onclick: () => J.fechar() }, 'Cancelar'), h('button', { type: 'button', class: 'btn pri', 'data-k': 'rv:ok', onclick: () => {
          const ts = cxT.filter(c => c.checked).map(c => c.getAttribute('data-t')), as = cxA.filter(c => c.checked).map(c => c.getAttribute('data-a'));
          if (!ts.length && !as.length) { toast('Marque o que revelar.'); return; }
          const tudo = ts.length === tr.length && as.length === ar.length;
          J.fechar();
          mudarH(hid, 'ligar o acerto', z => { z.liga.acerto.push(tudo ? { k: 'revelar', h: alvo, trechos: null, areas: null } : { k: 'revelar', h: alvo, trechos: ts, areas: as }); });
        } }, 'Ligar'))]);
    }
    async function addEntregar(hid) {
      const alvo = await escolherHandout('Ao acertar, entregar…', hid);
      if (alvo) mudarH(hid, 'ligar o acerto', z => { z.liga.acerto.push({ k: 'entregar', h: alvo }); });
    }
    function ligacoes(hid, x) {
      const linhas = x.liga.acerto.map((a, i) => {
        const y = A.handout(a.h);
        const txt = !y ? 'Um handout que não existe mais' : a.k === 'entregar' ? 'Entregar “' + y.nome + '” (a quem tem este puzzle)' : (a.trechos || a.areas ? 'Revelar ' + ((a.trechos || []).length + (a.areas || []).length) + ' pedaço(s) de “' + y.nome + '”' : 'Revelar tudo de “' + y.nome + '”');
        return h('div', { class: 'linha' }, h('span', { text: txt }), h('button', { type: 'button', class: 'ib leve', 'data-k': 'lg:' + i + ':tirar', title: 'Tirar', onclick: () => mudarH(hid, 'tirar uma ligação', z => { z.liga.acerto.splice(i, 1); }) }, '×'));
      });
      const erra = E.PUZZLES[x.puzzle.tipo].erra;
      const rs = A.relogios();
      return h('div', { class: 'cartao' },
        h('span', { class: 'sub', text: 'Ao acertar' }),
        h('div', { class: 'acerto' }, linhas.length ? linhas : h('p', { class: 'ajuda', text: 'Você recebe o aviso e a Mesa ao vivo diz quem resolveu.' })),
        h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn sm', 'data-k': 'lg:revelar', onclick: () => addRevelar(hid) }, '+ Revelar um trecho ou uma área'), h('button', { type: 'button', class: 'btn sm', 'data-k': 'lg:entregar', onclick: () => addEntregar(hid) }, '+ Entregar outro handout')),
        h('p', { class: 'ajuda', text: 'Uma porta que abre: nas Cenas, escolha a porta e, no painel dela, ligue-a a este puzzle.' }),
        erra ? [h('span', { class: 'sub', text: 'Ao errar' }), h('div', { class: 'row' },
          h('select', { class: 'in', 'data-k': 'lg:erro', style: { width: 'auto' }, onchange: ev => mudarH(hid, 'ligar o erro', z => { z.liga.erro = ev.target.value ? { relogio: ev.target.value, gomos: (z.liga.erro && z.liga.erro.gomos) || 1 } : null; }) },
            h('option', { value: '', text: 'Nada acontece', selected: !x.liga.erro ? true : null }), rs.map(r => h('option', { value: r.id, text: 'O relógio ' + r.r.nome + ' anda', selected: x.liga.erro && x.liga.erro.relogio === r.id ? true : null }))),
          x.liga.erro ? h('select', { class: 'in', 'data-k': 'lg:gomos', style: { width: 'auto' }, onchange: ev => mudarH(hid, 'mudar os gomos do erro', z => { if (z.liga.erro) z.liga.erro.gomos = Number(ev.target.value); }) },
            [1, 2, 3].map(n => h('option', { value: String(n), text: n + (n === 1 ? ' gomo por erro' : ' gomos por erro'), selected: x.liga.erro.gomos === n ? true : null }))) : null),
          !rs.length ? h('p', { class: 'ajuda', text: 'Crie um relógio (na parte Relógios) para o erro custar alguma coisa.' }) : null] : null);
    }

    /* ---------------- o que está com os jogadores ---------------- */
    function entregue(hid, x) {
      const linhas = [];
      if (!x.entregue) {
        linhas.push(h('p', { class: 'ajuda', text: k.naMesa() ? 'Ainda só com você.' : 'Fora de uma mesa, dá para montar e testar; numa mesa, os handouts vão para os jogadores.' }));
        linhas.push(h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn pri', 'data-k': 'h:entregar', disabled: !k.naMesa() || (x.tipo === 'puzzle' && k.bancoOk() !== true), onclick: () => entregarDlg(hid) }, 'Entregar…')));
        return h('div', { class: 'cartao ent' }, h('span', { class: 'sub', text: 'Com os jogadores' }), linhas);
      }
      const nova = A.versaoNova(hid, x);
      linhas.push(h('div', { class: 'estado', text: 'Com ' + A.quemRecebe(x.entregue.para) + ' desde ' + U.dataHora(x.entregue.em) + '.' }));
      if (nova) linhas.push(h('div', { class: 'aviso', text: 'Você mudou o handout depois de entregar: os jogadores ainda têm a versão de antes.' }));
      const jg = x.tipo === 'puzzle' ? A.jogoDe(hid, x) : null;
      if (jg) {
        const q = uid => k.nomeDe(uid) || 'alguém';
        linhas.push(h('div', { class: 'estado' }, jg.resolvido ? h('span', { class: 'badge ok', text: 'Resolvido por ' + q(jg.resolvido.por) + ' às ' + U.hora(jg.resolvido.em) }) : h('span', { class: 'badge', text: 'Ainda não resolveram' }),
          E.PUZZLES[jg.tipo].erra ? ' ' + (jg.erros === 1 ? '1 erro.' : jg.erros + ' erros.') : '', jg.ultimo && jg.ultimo.txt ? ' Último lance: ' + q(jg.ultimo.por) + ' ' + jg.ultimo.txt + ' (' + U.hora(jg.ultimo.em) + ').' : ''));
        linhas.push(h('details', { class: 'cartao', style: { background: 'var(--surface)' } }, h('summary', { class: 'sub', text: 'Ver como está' }),
          PUI.puzzle(jg, { chave: 'vivo:', soVer: true, quem: q, sel: selPeca, escolher: i => { selPeca = i; k.pintar(); } })));
      }
      const botoes = [];
      if (nova) botoes.push(h('button', { type: 'button', class: 'btn sm pri', 'data-k': 'h:versao', onclick: () => comFoto('mandar a versão nova de ' + x.nome, A.entregar(hid, x.entregue.para), 'Os jogadores receberam a versão nova.') }, 'Mandar a versão nova'));
      if (jg && !jg.resolvido && jg.tipo === 'charada') {
        const m = E.montarPuzzle(x.puzzle, x.img), ja = Array.isArray(jg.estado.dicas) ? jg.estado.dicas.length : 0;
        if (ja < m.dicas.length) botoes.push(h('button', { type: 'button', class: 'btn sm', 'data-k': 'h:dica', onclick: () => A.darDica(hid).then(d => { if (d) toast('Dica dada: “' + d + '”.'); k.pintar(); }, e => toast((e && e.message) || 'Não deu certo agora.')) }, 'Dar uma dica (' + (m.dicas.length - ja) + ')'));
      }
      if (jg && !jg.resolvido && jg.tipo === 'cifra') botoes.push(h('button', { type: 'button', class: 'btn sm', 'data-k': 'h:letra', onclick: () => A.darDica(hid).then(l => { if (l) toast('Letra revelada: ' + l + '.'); else toast('Não há mais letras para revelar.'); k.pintar(); }, e => toast((e && e.message) || 'Não deu certo agora.')) }, 'Revelar uma letra'));
      botoes.push(h('button', { type: 'button', class: 'btn sm', 'data-k': 'h:mais', onclick: () => entregarDlg(hid) }, x.entregue.para === 'mesa' ? 'Para quem vai…' : 'Entregar a mais alguém…'));
      if (jg) botoes.push(h('button', { type: 'button', class: 'btn sm', 'data-k': 'h:reiniciar', onclick: async () => { if (await J.confirmar('Recomeçar o puzzle?', 'O puzzle volta ao começo para os jogadores (o mesmo puzzle; sem erros, sem ninguém ter resolvido).', 'Recomeçar')) { const f = A.reiniciar(hid); k.empilhar('recomeçar ' + x.nome, f); k.pintar(); k.avisoDesfazer('O puzzle voltou ao começo.'); } } }, 'Recomeçar o puzzle'));
      botoes.push(h('button', { type: 'button', class: 'btn sm per', 'data-k': 'h:recolher', onclick: async () => { if (await J.confirmar('Tirar “' + x.nome + '” dos jogadores?', 'Some da aba Pistas deles' + (jg ? ', e o puzzle também' : '') + '. O handout fica com você (tem Desfazer).', 'Tirar', true)) { const f = A.recolher(hid); k.empilhar('tirar ' + x.nome + ' dos jogadores', f); k.pintar(); k.avisoDesfazer('“' + x.nome + '” saiu das Pistas dos jogadores.'); } } }, 'Tirar dos jogadores'));
      return h('div', { class: 'cartao ent' }, h('span', { class: 'sub', text: 'Com os jogadores' }), linhas, h('div', { class: 'row' }, botoes));
    }

    /* ---------------- o editor ---------------- */
    function editor(hid, x) {
      const form = [];
      form.push(h('div', { class: 'cab' },
        h('span', { class: 'ico', style: { color: 'var(--ouro)' } }, icone(ICO[x.tipo], 22)),
        h('input', { class: 'in nome', 'data-k': 'h:nome', value: x.nome, maxlength: E.LIM.nome, 'aria-label': 'O nome do handout', oninput: ev => mudarH(hid, 'renomear', y => { y.nome = ev.target.value || y.nome; }, 'h:nome') }),
        h('button', { type: 'button', class: 'btn sm per', 'data-k': 'h:apagar', onclick: async () => {
          if (!(await J.confirmar('Apagar “' + x.nome + '”?', x.entregue ? 'Sai também das Pistas dos jogadores (tem Desfazer).' : 'Tem Desfazer.', 'Apagar', true))) return;
          const f = A.apagarHandout(hid); k.empilhar('apagar ' + x.nome, f); k.pintar(); k.avisoDesfazer('“' + x.nome + '” apagado.');
        } }, 'Apagar')));
      if (k.naMesa() && k.temCampanhas()) form.push(h('label', { class: 'field' }, h('span', { text: 'Campanha' }), h('select', { class: 'in', 'data-k': 'h:camp', disabled: !!x.entregue, title: x.entregue ? 'Tire dos jogadores antes de trocar a campanha' : null,
        onchange: ev => mudarH(hid, 'mudar a campanha', y => { y.camp = ev.target.value || null; }) }, h('option', { value: '', text: 'Do mundo (todas)', selected: !x.camp ? true : null }), k.campanhas().map(c => h('option', { value: c.id, text: c.nome, selected: x.camp === c.id ? true : null })))));
      if (x.tipo === 'puzzle') form.push(configPuzzle(hid, x));
      // a imagem (a do handout de imagem; na carta e no puzzle, opcional — no quebra-cabeça, a imagem é o puzzle)
      if (!(x.tipo === 'puzzle' && x.puzzle.tipo === 'imagem')) {
        const temImg = !!x.img;
        form.push(h('div', { class: 'cartao' }, h('span', { class: 'sub', text: x.tipo === 'imagem' ? 'A imagem' : 'Uma imagem (opcional)' }),
          temImg ? [imagemComAreas(hid, x, true), h('p', { class: 'ajuda', text: 'Arraste sobre a imagem para esconder uma área: os jogadores a veem coberta até você revelar.' }),
            x.areas.length ? h('div', { class: 'trechos' }, x.areas.map((a, i) => h('div', { class: 'trecho' + (a.rev ? ' rev' : '') }, h('span', { text: 'Área ' + (i + 1) + (a.rev ? ' — revelada' : ' — escondida') }),
              h('button', { type: 'button', class: 'btn xs' + (a.rev ? '' : ' pri'), 'data-k': 'h:area:' + a.id + ':rev', onclick: () => revelarUm(hid, { trechos: [], areas: [a.id] }, a.rev) }, a.rev ? 'Esconder de novo' : 'Revelar'),
              h('button', { type: 'button', class: 'ib leve', 'data-k': 'h:area:' + a.id + ':tirar', title: 'Tirar a área', onclick: () => mudarH(hid, 'tirar uma área', y => { y.areas = y.areas.filter(b => b.id !== a.id); }) }, '×')))) : null,
            h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn sm', 'data-k': 'h:img', onclick: () => escolherImagem(hid) }, 'Trocar a imagem'), x.tipo !== 'imagem' ? h('button', { type: 'button', class: 'btn sm', 'data-k': 'h:img-tirar', onclick: () => mudarH(hid, 'tirar a imagem', y => { y.img = null; y.areas = []; }) }, 'Tirar a imagem') : null)]
            : h('button', { type: 'button', class: x.tipo === 'imagem' ? 'btn pri' : 'btn sm', 'data-k': 'h:img', onclick: () => escolherImagem(hid) }, 'Escolher a imagem'),
          x.tipo === 'imagem' ? h('label', { class: 'field' }, h('span', { text: 'Legenda' }), h('input', { class: 'in', 'data-k': 'h:legenda', value: x.legenda, maxlength: E.LIM.legenda, oninput: ev => mudarH(hid, 'mudar a legenda', y => { y.legenda = ev.target.value; }, 'h:legenda') })) : null));
      }
      // o texto (a carta; na imagem, uma nota; no puzzle, o que vem antes)
      const tr = E.trechos(x.texto);
      form.push(h('div', { class: 'cartao' },
        h('span', { class: 'sub', text: x.tipo === 'carta' ? 'O texto' : x.tipo === 'imagem' ? 'Uma nota embaixo (opcional)' : 'O que vem antes do puzzle (opcional)' }),
        x.tipo === 'carta' ? h('div', { class: 'seg', role: 'group', 'aria-label': 'O papel' }, Object.keys(E.PAPEIS).map(p => h('button', { type: 'button', 'data-k': 'h:papel:' + p, 'aria-pressed': String(x.papel === p), onclick: () => mudarH(hid, 'mudar o papel', y => { y.papel = p; }) }, E.PAPEIS[p]))) : null,
        h('textarea', { class: 'in', rows: x.tipo === 'carta' ? 9 : 3, 'data-k': 'h:texto', value: x.texto, maxlength: E.LIM.texto, placeholder: x.tipo === 'carta' ? 'Caro amigo, …' : '', 'aria-label': 'O texto',
          oninput: ev => mudarH(hid, 'escrever o texto', y => { y.texto = ev.target.value; }, 'h:texto') }),
        h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn sm', 'data-k': 'h:esconder', onclick: () => {
          const ta = document.querySelector('[data-k="h:texto"]');
          if (!ta) return;
          const a = ta.selectionStart, b = ta.selectionEnd;
          if (a == null || b == null || a === b) { toast('Selecione no texto o trecho que fica escondido.'); return; }
          const v = ta.value;
          mudarH(hid, 'esconder um trecho', y => { y.texto = v.slice(0, a) + '{{' + v.slice(a, b) + '}}' + v.slice(b); });
        } }, 'Esconder o trecho selecionado'), h('span', { class: 'ajuda', text: 'ou escreva {{assim}}.' })),
        x.tipo === 'carta' ? h('label', { class: 'field' }, h('span', { text: 'Assinatura (opcional)' }), h('input', { class: 'in', 'data-k': 'h:ass', value: x.assinatura, maxlength: 80, oninput: ev => mudarH(hid, 'mudar a assinatura', y => { y.assinatura = ev.target.value; }, 'h:ass') })) : null,
        tr.length ? h('div', { class: 'trechos' }, tr.map(t => { const rev = x.revelados.includes(t.k); return h('div', { class: 'trecho' + (rev ? ' rev' : '') }, h('span', { text: '“' + t.txt + '”' + (rev ? ' — revelado' : ' — escondido') }),
          h('button', { type: 'button', class: 'btn xs' + (rev ? '' : ' pri'), 'data-k': 'h:tr:' + t.k, onclick: () => revelarUm(hid, { trechos: [t.k], areas: [] }, rev) }, rev ? 'Esconder de novo' : 'Revelar')); }),
          tr.some(t => !x.revelados.includes(t.k)) ? h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn xs', 'data-k': 'h:revelar-tudo', onclick: () => revelarUm(hid, null) }, 'Revelar tudo')) : null) : null));
      if (x.tipo === 'puzzle') form.push(ligacoes(hid, x));
      form.push(entregue(hid, x));
      const previa = h('aside', { class: 'previa', 'aria-label': 'Como os jogadores veem' },
        h('span', { class: 'sub', text: x.tipo === 'puzzle' ? 'Como os jogadores veem (teste à vontade)' : 'Como os jogadores veem' }),
        x.tipo !== 'puzzle' || x.texto.trim() || (x.img && x.puzzle.tipo !== 'imagem') ? h('div', { class: 'moldura' }, previaHandout(hid, x)) : null,
        x.tipo === 'puzzle' ? h('div', { style: { display: 'grid', gap: '8px' } }, teste(hid, x)) : null);
      return h('div', { class: 'ed' }, h('div', { class: 'form' }, form), previa);
    }

    /* ---------------- a lista ---------------- */
    function pintar() {
      const todos = A.handouts();
      if (sel && !todos.some(x => x.id === sel)) sel = null;
      if (!sel && todos.length) sel = todos[0].id;
      const vis = todos.filter(x => filtro === 'todos' || x.h.tipo === filtro);
      const grupos = k.porCampanha(vis, x => x.h.camp);
      const status = x => {
        if (!x.h.entregue) return 'Ainda só com você';
        const jg = x.h.tipo === 'puzzle' ? A.jogoDe(x.id, x.h) : null;
        return 'Com ' + A.quemRecebe(x.h.entregue.para) + (jg && jg.resolvido ? ' · resolvido' : '');
      };
      const lista = h('nav', { class: 'lista', 'aria-label': 'Os handouts' },
        h('div', { class: 'row' }, ['imagem', 'carta', 'puzzle'].map(t => h('button', { type: 'button', class: 'btn sm' + (t === 'puzzle' ? ' pri' : ''), 'data-k': 'h:novo:' + t, onclick: () => novoComDesfazer(t) }, '+ ' + { imagem: 'Imagem', carta: 'Carta', puzzle: 'Puzzle' }[t]))),
        todos.length ? h('div', { class: 'seg', role: 'group', 'aria-label': 'Mostrar' }, [['todos', 'Todos'], ['imagem', 'Imagens'], ['carta', 'Cartas'], ['puzzle', 'Puzzles']].map(([v, n]) => h('button', { type: 'button', 'data-k': 'h:f:' + v, 'aria-pressed': String(filtro === v), onclick: () => { filtro = v; k.pintar(); } }, n))) : null,
        grupos.map(g => [g.nome ? h('div', { class: 'grupo', text: g.nome }) : null, g.itens.map(x => h('button', { type: 'button', class: 'item', 'data-k': 'ho:' + x.id, 'aria-current': String(x.id === sel), onclick: () => { selecionar(x.id); k.pintar(); } },
          h('span', { class: 'ico' }, icone(ICO[x.h.tipo], 18)), h('span', { class: 'nm' }, h('b', { text: x.h.nome }), h('small', { text: (x.h.tipo === 'puzzle' ? E.PUZZLES[x.h.puzzle.tipo].nome + ' · ' : '') + status(x) })),
          E.escondidos(x.h) ? h('span', { class: 'badge', title: 'Escondidos', text: E.escondidos(x.h) + ' ▒' }) : null))]),
        !todos.length ? h('p', { class: 'ajuda', text: 'Uma imagem (um mapa, um retrato), uma carta ou um puzzle. Você entrega quando quiser, e pode esconder pedaços para revelar depois.' }) : null);
      const x = sel ? A.handout(sel) : null;
      return h('div', { class: 'cols' }, lista, x ? editor(sel, x) : h('div', { class: 'vazio' }, h('p', { class: 'tit', text: 'Handouts e puzzles' }),
        h('p', { text: 'Imagens, cartas e puzzles para entregar aos jogadores: à mesa toda ou só a alguns. Os puzzles saem sorteados, com solução garantida, e os jogadores resolvem juntos.' })));
    }
    return { pintar, entregarDlg, selecionar, get sel() { return sel; }, testes };
  };
})();
