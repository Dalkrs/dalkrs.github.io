/* Tiny Cats · o Escudo do mestre na casca (lote 31).
   · Quem joga: a aba Pistas aparece quando há alguma pista para a pessoa; quando chega uma nova, uma janela a mostra
     (se a pessoa estiver escrevendo, ou com outra janela aberta, vira um aviso com "Ver"); quando o mestre revela mais
     de uma que ela já tinha, um aviso.
   · O mestre da mesa: o vigia — quando os jogadores resolvem um puzzle, acontece o que o mestre ligou a ele (revelar,
     entregar); quando erram, o relógio ligado anda; e o que a mesa vê dos relógios (escudo:vista) acompanha os
     relógios. Cada coisa que o vigia faz tem um aviso com Desfazer.
   · Quem mestra o Escudo: o painel do roteiro, ao lado, em qualquer aba — a sessão em jogo (ou a próxima), os passos
     (marcar, e o clique faz a ação: abrir a cena, ir ao lugar, puxar o encontro, abrir o handout, avançar o relógio), um
     passo novo e os relógios, com − e +.
   TC.escudoCasca.iniciar(kit) — kit: { mesas, conta, dados, toast, irPara, pintarAbas, abrirJanela, fecharJanela,
   ocupadoAgora, botao, painel, guarda } */
(() => {
  'use strict';
  const E = window.TC.escudo, U = window.TC.dom, PUI = window.TC.pistasUI;
  const { h, icone } = U;
  const j = JSON.stringify;
  const ICO = {
    cena: 'M3 5h18v14H3zM3 9h18M8 5v4', lugar: 'M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5',
    encontro: 'M14.5 3.5H20.5v6L10 20l-6-6zM3.5 20.5l3-3M7.5 13.5l3 3', handout: 'M6 3.5h12v17H6zM9 8h6M9 11.5h6M9 15h3', relogio: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 3v9l6 4',
    npc: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c.8-3.8 3.9-6 7.5-6s6.7 2.2 7.5 6',
  };
  function iniciar(k) {
    const { mesas, dados, toast } = k;
    const col = () => { try { return mesas.atual ? dados.col('documentos') : null; } catch (e) { return null; } };
    const mestraEscudo = () => !!mesas.atual && mesas.atual.papel === 'mestre' && (!mesas.mestra || mesas.mestra('escudo'));
    const mestreDaMesa = () => !!mesas.atual && mesas.atual.cargo === 'mestre' && mesas.atual.papel === 'mestre' && !mesas.atual.auditoria;
    let bancoOk = null, A = null, Dvisto = null;
    function acoes() {
      const D = col();
      if (!D) return null;
      if (A && Dvisto === D) return A;
      Dvisto = D;
      A = window.TC.escudoAcoes({ D, membros: () => (mesas.atual ? mesas.atual.membros : []), bancoOk: () => bancoOk === true,
        subir: blob => window.TC.arquivos.subir(blob), jogar: (id, op, mudas, prova) => dados.escudo('jogar', { id, op, mudas, prova }) });
      return A;
    }

    /* ---------------- as pistas de quem joga ---------------- */
    const chave = pre => pre + (mesas.atual ? mesas.atual.id : '');
    const lerMapa = c => { try { const v = JSON.parse(k.guarda.ler(c) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } };
    function minhasPistas() {
      const D = col();
      if (!D || mestraEscudo()) return [];
      return D.todas().filter(l => l && !l.apagado && E.hidDaPista(l.id));
    }
    const temPistas = () => minhasPistas().length > 0;
    let tinha = false, tPistas = 0;
    function janelaDaPista(l) {
      const p = E.normPista(l.dados);
      const c = h('div', { class: 'dl pista-janela', 'data-k': 'pista-janela' },
        h('div', { class: 'pj-cab' }, h('span', { class: 'pj-sobre', text: 'O mestre entregou uma pista' })),
        p.tipo === 'puzzle' ? h('div', { class: 'pj-pz' }, h('h2', { text: p.nome }), h('p', { text: 'Um puzzle' + (p.puzzle ? ': ' + p.puzzle.nome + ' (' + E.DIF[p.puzzle.dif].toLowerCase() + ')' : '') + '. Resolvam juntos, na aba Pistas.' }),
          p.partes.some(x => typeof x === 'number' || String(x).trim()) ? PUI.handout(Object.assign({}, p, { img: null }), {}) : null) : PUI.handout(p, { grande: true }),
        h('div', { class: 'pe' }, h('button', { type: 'button', class: 'btn', 'data-k': 'pj:fechar', text: 'Fechar', onclick: () => k.fecharJanela() }),
          h('button', { type: 'button', class: 'btn pri', 'data-k': 'pj:abrir', text: p.tipo === 'puzzle' ? 'Resolver agora' : 'Abrir nas Pistas', onclick: () => { k.fecharJanela(); k.irPara('pistas', { pista: l.id }); } })));
      k.abrirJanela(c);
    }
    function conferirPistas() {
      const tem = temPistas();
      if (tem !== tinha) { tinha = tem; k.pintarAbas(); }
      if (!tem || !mesas.atual) return;
      const cA = chave('tinycats:pistas:avisadas:'), avisadas = lerMapa(cA), vistas = lerMapa(chave('tinycats:pistas:vistas:'));
      const ls = minhasPistas();
      const novas = ls.filter(l => !(l.id in avisadas) && !(l.id in vistas));
      const mudaram = ls.filter(l => (l.id in avisadas) && (avisadas[l.id] || 0) < (l.rev || 0) && (vistas[l.id] || 0) < (l.rev || 0));
      for (const l of ls) avisadas[l.id] = Math.max(avisadas[l.id] || 0, l.rev || 0);
      k.guarda.gravar(cA, j(avisadas));
      const naPistas = k.atual && k.atual() === 'pistas';
      if (novas.length && !naPistas) {
        const l = novas[0], p = E.normPista(l.dados);
        if (novas.length === 1 && !k.ocupadoAgora()) janelaDaPista(l);
        else toast(novas.length === 1 ? 'Uma pista nova: “' + p.nome + '”.' : novas.length + ' pistas novas.', 'Ver', () => k.irPara('pistas', novas.length === 1 ? { pista: l.id } : null), 12000);
      }
      if (mudaram.length && !naPistas) {
        const p = E.normPista(mudaram[0].dados);
        toast('“' + p.nome + '” mudou: o mestre revelou mais.', 'Ver', () => k.irPara('pistas', { pista: mudaram[0].id }), 10000);
      }
    }

    /* ---------------- o vigia (o mestre da mesa) ---------------- */
    let tVigia = 0, vigiando = false, deNovo = false;
    async function vigiar() {
      if (!mestraEscudo() || (mesas.atual && mesas.atual.auditoria)) return;
      const a = acoes();
      if (!a) return;
      if (vigiando) { deNovo = true; return; }
      vigiando = true;
      try {
        a.sincronizarVistas();                       // (quem mestra o Escudo: o que a mesa vê dos relógios acompanha)
        const avisos = mestreDaMesa() ? await a.processar() : [];      // (os puzzles: só o mestre da mesa, para não fazer duas vezes)
        for (const x of avisos) {
          if (x.antes) toast(x.txt, 'Desfazer', () => { a.voltar(x.antes); pintarPainel(); }, 14000);
          else toast(x.txt, null, null, 9000);
          if (x.consequencia) toast(x.consequencia, null, null, 16000);
        }
      } catch (e) { console.error(e); }
      finally { vigiando = false; if (deNovo) { deNovo = false; clearTimeout(tVigia); tVigia = setTimeout(vigiar, 300); } }
      pintarPainel();
    }

    // (lote 46) o cronômetro dos puzzles: o vigia passa de tempos em tempos (só faz algo se um puzzle com tempo acabou)
    setInterval(() => {
      try {
        const a = mestraEscudo() && mestreDaMesa() && acoes();
        if (a && a.handouts().some(x => { if (x.h.tipo !== 'puzzle' || !x.h.entregue) return false; const jg = a.jogoDe(x.id, x.h); const pr = jg && E.prazo(jg); return !!(pr && pr.acabou && !jg.resolvido && jg.estado.fim !== 1); })) vigiar();
      } catch (e) { /* (a mesa fechando) */ }
    }, 4000);

    /* ---------------- o painel do roteiro ---------------- */
    const painel = k.painel, botao = k.botao;
    let aberto = k.guarda.ler('tinycats:roteiro') === '1', selS = null;
    function mostrar(v, lembrar) {
      aberto = !!v && mestraEscudo();
      painel.hidden = !aberto;
      botao.setAttribute('aria-pressed', String(aberto));
      if (lembrar) k.guarda.gravar('tinycats:roteiro', aberto ? '1' : '0');
      if (aberto) pintarPainel();
    }
    botao.addEventListener('click', () => mostrar(painel.hidden, true));
    function pintarBotao() { botao.hidden = !mestraEscudo(); if (botao.hidden && !painel.hidden) { painel.hidden = true; } else if (!botao.hidden && aberto && painel.hidden) mostrar(true); }
    function irLiga(a, s, p) {
      const l = p.liga;
      if (l.k === 'relogio') {
        const f = a.foto([E.PRE.relogio + l.id]);
        const res = a.avancarRelogio(l.id, l.n);
        if (!res) { toast('Este relógio não existe mais.'); return; }
        pintarPainel();
        toast(res.r.nome + ': ' + res.antes + ' → ' + res.r.cheio + ' de ' + res.r.gomos + (res.encheu ? ' — encheu!' + (res.r.consequencia ? ' ' + res.r.consequencia : '') : '.'), 'Desfazer', () => { a.voltar(f); pintarPainel(); }, res.encheu ? 16000 : 9000);
        return;
      }
      if (l.k === 'cena') k.irPara('cenas', { cena: l.id });
      else if (l.k === 'lugar') k.irPara('mundo', { mapa: l.mapa, obj: l.obj });
      else if (l.k === 'handout') k.irPara('escudo', { handout: l.id });
      // (lote 32) o NPC: o cartão dele abre ali mesmo, embaixo do passo (quem é, o jeito, o que quer e esconde)
      else if (l.k === 'npc') { if (npcAberto.has(p.id)) npcAberto.delete(p.id); else npcAberto.add(p.id); pintarPainel(); }
      else if (l.k === 'encontro') {
        const d = a.dadosDe('best:enc:' + l.id);
        const itens = d && Array.isArray(d.itens) ? d.itens.filter(x => x && typeof x.id === 'string' && x.n > 0).map(x => ({ id: x.id, n: Math.min(30, Math.round(x.n)) })) : [];
        if (!itens.length) { toast('Este encontro não existe mais no Bestiário.'); return; }
        k.irPara('cenas', { bestiario: { itens, ocultos: false } });
        if (s.estado === 'aberta') a.logar('encontro', String(d.nome || 'Encontro') + ' foi para a cena', s.camp);
      }
    }
    function nomeLiga(a, l) {
      if (!l) return '';
      if (l.k === 'cena') { const d = a.dadosDe('cena:' + l.id + ':m'); return d ? String(d.name || 'Cena') : ''; }
      if (l.k === 'lugar') { const m = a.dadosDe('mundo:mapa:' + l.mapa); const o = m && Array.isArray(m.objs) ? m.objs.find(x => x && x.id === l.obj) : null; return o ? String(o.nome || 'Lugar') : ''; }
      if (l.k === 'encontro') { const d = a.dadosDe('best:enc:' + l.id); return d ? String(d.nome || 'Encontro') : ''; }
      if (l.k === 'handout') { const x = a.handout(l.id); return x ? x.nome : ''; }
      if (l.k === 'relogio') { const x = a.relogio(l.id); return x ? x.nome : ''; }
      if (l.k === 'npc') { const d = a.dadosDe('escudo:npc:' + l.id); return d ? String(d.nome || 'NPC') : ''; }
      return '';
    }
    const ROT = { cena: 'Abrir', lugar: 'Ver', encontro: 'Puxar', handout: 'Abrir', relogio: '+1', npc: 'Ver' };
    const npcAberto = new Set();
    // (lote 32) o cartão do NPC no painel: o bastante para interpretar sem sair da aba
    function cartaoNpc(a, l) {
      const N = window.TC.npc, d = a.dadosDe('escudo:npc:' + l.id);
      if (!N || !d) return null;
      const n = N.normNpc(d), ds = N.descricao(n);
      const lin = (rot, t) => (t ? h('p', null, h('b', { text: rot + ' ' }), t) : null);
      return h('div', { class: 'rt-npc', 'data-k': 'rt:npc:' + l.id },
        h('p', { class: 'rt-npc-q', text: ds.quem }),
        lin('Aparência:', ds.aparencia), lin('Jeito:', ds.jeito), lin('Quer:', n.motivacao), lin('Esconde:', n.segredo), lin('Gancho:', n.gancho),
        h('button', { type: 'button', class: 'link', 'data-k': 'rt:npc-abrir:' + l.id, onclick: () => k.irPara('escudo', { npc: l.id }) }, 'Abrir no Escudo'));
    }
    function pintarPainel() {
      if (painel.hidden) return;
      const a = acoes();
      if (!a || !mestraEscudo()) { painel.replaceChildren(); return; }
      const cv = mesas.campanha ? mesas.campanha() : null, ss = a.sessoes(), camp = cv ? cv.id : null;
      const vista = ss.filter(x => x.s.estado !== 'fechada');
      if (selS && !vista.some(x => x.id === selS)) selS = null;
      const ab = a.sessaoAberta(camp) || a.sessaoAberta();
      const pr = E.proximaPlanejada(ss, camp) || E.proximaPlanejada(ss, null);
      const s0 = selS ? vista.find(x => x.id === selS) : ab || pr || null;
      const corpo = [];
      const foco = document.activeElement && painel.contains(document.activeElement) && document.activeElement.getAttribute('data-k') === 'rt:novo' ? document.activeElement.value : null;
      corpo.push(h('div', { class: 'rt-h' }, h('strong', { text: 'Roteiro' }),
        vista.length > 1 ? h('select', { class: 'rt-sel', 'data-k': 'rt:sessao', 'aria-label': 'A sessão', onchange: ev => { selS = ev.target.value; pintarPainel(); } },
          vista.map(x => h('option', { value: x.id, text: x.s.nome + (x.s.estado === 'aberta' ? ' (em jogo)' : ''), selected: s0 && x.id === s0.id ? true : null }))) : null,
        h('span', { class: 'esp' }, h('button', { type: 'button', class: 'ib', 'data-k': 'rt:escudo', title: 'Abrir no Escudo do mestre', 'aria-label': 'Abrir no Escudo do mestre', onclick: () => k.irPara('escudo', s0 ? { sessao: s0.id } : null) }, icone('M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5', 15)),
          h('button', { type: 'button', class: 'ib', 'data-k': 'rt:fechar', title: 'Fechar o painel', 'aria-label': 'Fechar o painel do roteiro', onclick: () => mostrar(false, true) }, '×'))));
      if (!s0) corpo.push(h('div', { class: 'rt-vazio' }, h('p', { text: 'Nenhuma sessão planejada.' }), h('button', { type: 'button', class: 'btn sm pri', 'data-k': 'rt:criar', onclick: () => { const id = a.sessaoNova(camp); selS = id; pintarPainel(); } }, '+ Sessão')));
      else {
        const s = s0.s, sid = s0.id;
        corpo.push(h('div', { class: 'rt-sessao' }, h('b', { text: s.nome }), h('span', { class: 'rt-est' + (s.estado === 'aberta' ? ' em' : ''), text: s.estado === 'aberta' ? 'Em jogo' : 'Planejada' }),
          s.estado === 'plano' ? h('button', { type: 'button', class: 'btn sm', 'data-k': 'rt:abrir', onclick: () => { const outra = a.sessaoAberta(s.camp); if (outra && outra.id !== sid) { toast(outra.s.nome + ' ainda está em jogo: feche-a no Escudo antes.'); return; } const f = a.foto([E.PRE.sessao + sid]); a.abrirSessao(sid); pintarPainel(); toast(s.nome + ' em jogo.', 'Desfazer', () => { a.voltar(f); pintarPainel(); }); } }, 'Abrir a sessão')
            : h('button', { type: 'button', class: 'btn sm', 'data-k': 'rt:fecharSessao', onclick: () => k.irPara('escudo', { sessao: sid }) }, 'Fechar…')));
        const mudar = (rot, fn) => { const f = a.foto([E.PRE.sessao + sid]); const x = a.sessao(sid); if (!x) return; fn(x); a.gravarSessao(sid, x); pintarPainel(); return f; };
        corpo.push(h('ol', { class: 'rt-passos' }, s.passos.map(p => {
          const nome = nomeLiga(a, p.liga);
          return h('li', { class: 'rt-p' + (p.feito ? ' feito' : '') },
            h('input', { type: 'checkbox', 'data-k': 'rt:p:' + p.id, checked: p.feito ? true : null, 'aria-label': 'Aconteceu: ' + (p.txt || 'passo'),
              onchange: ev => mudar('marcar', x => { const q = x.passos.find(y => y.id === p.id); if (q) q.feito = ev.target.checked; if (ev.target.checked && x.estado === 'aberta') x.log.push({ em: new Date().toISOString(), t: 'passo', txt: q ? q.txt : '' }); }) }),
            h('span', { class: 'rt-t' }, h('span', { text: p.txt || 'Passo sem nome' }), p.liga && nome ? h('small', null, icone(ICO[p.liga.k], 12), ' ' + nome) : null, p.nota ? h('small', { class: 'rt-nota', text: p.nota }) : null),
            p.liga && nome ? h('button', { type: 'button', class: 'btn xs' + (p.liga.k === 'relogio' || p.liga.k === 'encontro' ? ' pri' : ''), 'data-k': 'rt:ir:' + p.id, 'aria-expanded': p.liga.k === 'npc' ? String(npcAberto.has(p.id)) : null, onclick: () => irLiga(a, s, p) }, p.liga.k === 'relogio' ? (p.liga.n > 0 ? '+' : '') + p.liga.n : ROT[p.liga.k]) : null,
            p.liga && p.liga.k === 'npc' && nome && npcAberto.has(p.id) ? cartaoNpc(a, p.liga) : null);
        })));
        corpo.push(h('form', { class: 'rt-novo', onsubmit: ev => { ev.preventDefault(); const i = ev.target.querySelector('input'); const v = i.value.trim(); if (!v) return; i.value = ''; mudar('pôr', x => { x.passos.push(E.normPasso({ txt: v })); }); setTimeout(() => { const n = painel.querySelector('[data-k="rt:novo"]'); if (n) n.focus(); }, 10); } },
          h('input', { class: 'in', 'data-k': 'rt:novo', placeholder: 'Mais um passo…', maxlength: E.LIM.passo, 'aria-label': 'Um passo novo' }), h('button', { type: 'submit', class: 'btn sm', 'data-k': 'rt:por' }, 'Pôr')));
      }
      const rs = a.relogios().filter(x => !x.r.camp || x.r.camp === camp);
      if (rs.length) {
        corpo.push(h('div', { class: 'rt-rels' }, h('div', { class: 'rt-sub', text: 'Relógios' }), rs.map(x => {
          const r = x.r, cor = E.CORES[r.cor][1];
          const andar = n => { const f = a.foto([E.PRE.relogio + x.id]); const res = a.avancarRelogio(x.id, n); pintarPainel(); if (res && res.encheu) toast(r.nome + ' encheu!' + (r.consequencia ? ' ' + r.consequencia : ''), 'Desfazer', () => { a.voltar(f); pintarPainel(); }, 16000); };
          return h('div', { class: 'rt-rel' + (r.cheio >= r.gomos ? ' cheio' : '') },
            h('span', { class: 'rt-gomos', 'aria-hidden': 'true' }, [...Array(r.gomos)].map((_, i) => h('i', { style: { background: i < r.cheio ? cor : null } }))),
            h('span', { class: 'rt-rn', text: r.nome + (r.vista ? '' : ' · só você') }),
            h('button', { type: 'button', class: 'ib', 'data-k': 'rt:r:' + x.id + ':menos', disabled: r.cheio <= 0 ? true : null, 'aria-label': 'Voltar um gomo de ' + r.nome, onclick: () => andar(-1) }, '−'),
            h('span', { class: 'rt-n', text: r.cheio + '/' + r.gomos }),
            h('button', { type: 'button', class: 'ib', 'data-k': 'rt:r:' + x.id + ':mais', disabled: r.cheio >= r.gomos ? true : null, 'aria-label': 'Avançar um gomo de ' + r.nome, onclick: () => andar(1) }, '+'));
        })));
      }
      painel.replaceChildren(...corpo);
      if (foco != null) { const n = painel.querySelector('[data-k="rt:novo"]'); if (n) { n.value = foco; n.focus(); } }
    }

    /* ---------------- ouvir ---------------- */
    let tPainel = 0;
    dados.on('muda', (c, l) => {
      if (c !== 'documentos' || !l || typeof l.id !== 'string') return;
      if (l.id.startsWith('pista:')) { clearTimeout(tPistas); tPistas = setTimeout(conferirPistas, 250); }
      if (l.id.startsWith('pista:jogo:') || l.id.startsWith('escudo:relogio:') || l.id.startsWith('escudo:handout:')) { clearTimeout(tVigia); tVigia = setTimeout(vigiar, 400); }
      if (l.id.startsWith('escudo:') || l.id.startsWith('cena:') || l.id.startsWith('best:enc:')) { clearTimeout(tPainel); tPainel = setTimeout(pintarPainel, 150); }
    });
    mesas.on('muda', a => {
      bancoOk = null; A = null; Dvisto = null; selS = null; tinha = false;
      pintarBotao();
      if (!a) return;
      try {
        const D = dados.col('documentos');
        D.pronta.then(() => { if (mesas.atual !== a) return; conferirPistas(); pintarPainel(); }, () => { /* sem os documentos */ });
      } catch (e) { /* sem os documentos */ }
      if (typeof dados.escudo === 'function') dados.escudo('versao').then(() => { if (mesas.atual === a) { bancoOk = true; vigiar(); } }, () => { if (mesas.atual === a) bancoOk = false; });
    });
    pintarBotao();
    const api = { temPistas, acoes, pintarPainel, mostrar, conferirPistas, vigiar, get bancoOk() { return bancoOk; } };
    window.TC.escudoCasca.api = api;                     // (para os testes)
    return api;
  }
  window.TC = window.TC || {};
  window.TC.escudoCasca = { iniciar };
})();
