/* Tiny Cats · Escudo do mestre (lote 32): os NPCs.
   À esquerda, os NPCs guardados (a busca e os filtros por lugar e por facção ou clã); à direita, o NPC aberto — o
   nome (com outros nomes do mesmo estilo), quem é, a aparência, o jeito, o que quer, o que esconde, o gancho, os
   números de ficha, onde vive e de que lado está — ou o gerador: escolha a raça, o papel e o lugar, e saem três
   opções para ficar com uma. Um clique faz do NPC uma ficha nas Fichas ou um token na cena; "Pôr no roteiro" liga o
   NPC a um passo da sessão. As raças são uma lista que o mestre monta (o estilo dos nomes e a aparência de cada uma;
   começa pelas que estão nas fichas). Para a página, window.EscudoNpcs(kit). */
(() => {
  'use strict';
  window.EscudoNpcs = function (k) {
    const { E, U, N, A, J, toast } = k;
    const { h, icone } = U;
    const copia = x => (x == null ? x : JSON.parse(JSON.stringify(x)));
    const ID = id => N.PRE + id;
    let sel = U.guarda.ler('tinycats:escudo:npc') || null, modo = 'lista', busca = '', fLugar = '', fFac = '';
    // o gerador: as escolhas e as três opções da vez
    const ger = { raca: '', estilo: '', papel: '', gen: '', lugar: '', fac: '', opcoes: [] };
    function selecionar(id) { sel = id; modo = 'lista'; U.guarda.gravar('tinycats:escudo:npc', id); }

    /* ---------------- o que há na mesa ---------------- */
    function npcs() {
      return A.D.todas().filter(l => !l.apagado && typeof l.id === 'string' && l.id.startsWith(N.PRE) && E.idOk(l.id.slice(N.PRE.length)))
        .map(l => ({ id: l.id.slice(N.PRE.length), n: N.normNpc(l.dados) })).sort((a, b) => a.n.nome.localeCompare(b.n.nome, 'pt-BR'));
    }
    const npc = id => { const d = A.dadosDe(ID(id)); return d ? N.normNpc(d) : null; };
    const racas = () => N.normRacas(A.dadosDe(N.RACAS));
    // os lugares do Mapa-múndi (os marcadores e as regiões com nome) e as facções dos mapas e os clãs
    function lugares() {
      if (!k.naMesa()) return [];
      const out = [];
      for (const l of A.D.todas()) {
        const m = !l.apagado && typeof l.id === 'string' ? /^mundo:mapa:([A-Za-z0-9_-]{1,40})$/.exec(l.id) : null;
        if (!m || !l.dados || !Array.isArray(l.dados.objs)) continue;
        for (const o of l.dados.objs) if (o && (o.k === 'm' || o.k === 'r') && typeof o.id === 'string' && E.idOk(o.id) && o.nome) out.push({ mapa: m[1], obj: o.id, nome: String(o.nome).slice(0, 60), sub: (o.k === 'r' ? 'Região' : 'Lugar') + ' · ' + String(l.dados.nome || 'Mapa') });
      }
      return out.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    }
    function faccoes() {
      if (!k.naMesa()) return [];
      const out = [], clas = new Map();
      for (const l of A.D.todas()) {
        if (l.apagado || typeof l.id !== 'string' || !l.dados) continue;
        const m = /^mundo:mapa:([A-Za-z0-9_-]{1,40})$/.exec(l.id);
        if (m && Array.isArray(l.dados.faccoes)) for (const f of l.dados.faccoes) if (f && E.idOk(f.id) && f.nome) out.push({ k: 'faccao', id: f.id, mapa: m[1], nome: String(f.nome).slice(0, 60), sub: 'Facção · ' + String(l.dados.nome || 'Mapa') });
        const c = /^cla:(?:c|pub):([A-Za-z0-9_-]{1,40})$/.exec(l.id);
        if (c && l.dados.nome && !clas.has(c[1])) clas.set(c[1], { k: 'cla', id: c[1], nome: String(l.dados.nome).slice(0, 60), sub: 'Clã' });
      }
      return out.concat([...clas.values()]).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    }
    const chaveLugar = l => (l ? l.mapa + '/' + l.obj : '');
    const chaveFac = f => (f ? f.k + '/' + f.id : '');
    // o nome de agora do lugar e da facção (o guardado vale quando o mapa sumiu)
    const nomeLugar = l => { if (!l) return ''; const x = lugares().find(y => y.mapa === l.mapa && y.obj === l.obj); return x ? x.nome : l.nome || 'Lugar'; };
    const nomeFac = f => { if (!f) return ''; const x = faccoes().find(y => y.k === f.k && y.id === f.id); return x ? x.nome : f.nome || (f.k === 'cla' ? 'Clã' : 'Facção'); };
    // a ficha que o NPC virou (nas Fichas), se ainda existe
    function fichaViva(n) { const P = k.P(); if (!n || !n.pc || !P) return null; const l = P.pegar(n.pc); return l && !l.apagado ? l : null; }

    /* ---------------- mudar ---------------- */
    function mudarN(id, rotulo, fn, chaveTexto) {
      // (o que não muda nada não vira um passo do Desfazer)
      { const x0 = npc(id); if (!x0) return; const x1 = copia(x0); fn(x1); if (JSON.stringify(N.normNpc(x1)) === JSON.stringify(x0)) return; }
      const faz = () => { const x = npc(id); if (!x) return; fn(x); A.gravar(ID(id), N.normNpc(x)); };
      if (chaveTexto) { k.mudarTexto(chaveTexto, rotulo, [ID(id)], faz); return; }
      k.mudar(rotulo, [ID(id)], faz);
    }
    function guardar(n) {
      const id = N.novoId('np');
      const d = N.normNpc(Object.assign({}, n, { camp: k.campVista(), em: new Date().toISOString() }));
      k.mudar('guardar ' + d.nome, [ID(id)], () => A.gravar(ID(id), d));
      selecionar(id);
      k.pintar();
      k.avisoDesfazer(d.nome + ' entrou nos NPCs.');
      return id;
    }

    /* ---------------- o gerador ---------------- */
    function gerar() {
      const rs = racas(), lug = lugares().find(x => chaveLugar(x) === ger.lugar) || null, fac = faccoes().find(x => chaveFac(x) === ger.fac) || null;
      const [rid, sid] = ger.raca ? ger.raca.split(':') : ['', ''];
      ger.opcoes = [0, 1, 2].map(() => {
        const seed = N.novaSemente(), r = N.mulberry(seed);
        const raca = rs.lista.length ? N.escolherRaca(rs, rid || null, rid ? (sid || '') : '', r) : null;
        return N.gerar({ raca, estilo: ger.estilo || null, papel: ger.papel || null, gen: ger.gen, lugar: lug ? { mapa: lug.mapa, obj: lug.obj, nome: lug.nome } : null, fac: fac ? { k: fac.k, id: fac.id, nome: fac.nome, mapa: fac.mapa || null } : null }, seed);
      });
      k.pintar();
    }
    function abrirGerador() { modo = 'gerar'; if (!ger.opcoes.length) gerar(); else k.pintar(); }
    const fichaTxt = n => 'Tier ' + n.ficha.tier + ' · Lvl ' + n.ficha.nivel + ' · ' + N.ATRIBUTOS.map(a => a + ' ' + n.ficha.tiers[a]).join(' ');
    function cartaoOpcao(n, i) {
      const ds = N.descricao(n);
      const lin = (rot, t) => (t ? h('p', null, h('b', { text: rot + ' ' }), t) : null);
      return h('article', { class: 'npc-op', 'data-k': 'g:op' + i },
        h('h3', { text: n.nome }), h('p', { class: 'quem', text: ds.quem }),
        lin('Aparência:', ds.aparencia), lin('Jeito:', ds.jeito), lin('Quer:', n.motivacao), lin('Esconde:', n.segredo), lin('Gancho:', n.gancho),
        h('p', { class: 'nums', text: fichaTxt(n) }),
        h('button', { type: 'button', class: 'btn pri sm', 'data-k': 'g:escolher' + i, onclick: () => { guardar(n); } }, 'Ficar com este'));
    }
    function pintarGerador() {
      const rs = racas(), lug = lugares(), fac = faccoes();
      const sel_ = (k_, val, ops, on, rotulo) => h('label', { class: 'field' }, h('span', { text: rotulo }),
        h('select', { class: 'in', 'data-k': k_, onchange: ev => { on(ev.target.value); } }, ops.map(o => h('option', { value: o[0], text: o[1], selected: o[0] === val ? true : null }))));
      const opsRaca = [['', rs.lista.length ? 'Qualquer raça da lista' : 'Sem raça (a lista está vazia)']];
      for (const r of rs.lista) { opsRaca.push([r.id, r.nome]); for (const s of r.subs) opsRaca.push([r.id + ':' + s.id, '— ' + r.nome + ' ' + s.nome]); }
      return h('section', { class: 'det', 'aria-label': 'Gerar NPC' },
        h('div', { class: 'cab' }, h('h2', { class: 'tit', style: { flex: '1' }, text: 'Gerar NPC' }), h('button', { type: 'button', class: 'btn sm', 'data-k': 'g:fechar', onclick: () => { modo = 'lista'; k.pintar(); } }, 'Fechar')),
        h('div', { class: 'cartao' },
          h('div', { class: 'grade-ger' },
            sel_('g:raca', ger.raca, opsRaca, v => { ger.raca = v; }, 'Raça'),
            sel_('g:estilo', ger.estilo, [['', rs.lista.length ? 'O estilo da raça' : 'Qualquer estilo']].concat(N.ORDEM_ESTILOS.map(e => [e, N.ESTILOS[e].nome])), v => { ger.estilo = v; }, 'Estilo dos nomes'),
            sel_('g:papel', ger.papel, [['', 'Qualquer papel']].concat(N.ORDEM_PAPEIS.map(p => [p, N.PAPEIS[p].nome[0] + (N.PAPEIS[p].nome[1] !== N.PAPEIS[p].nome[0] ? ' / ' + N.PAPEIS[p].nome[1] : '')])), v => { ger.papel = v; }, 'Papel'),
            sel_('g:gen', ger.gen, [['', 'Qualquer'], ['m', 'Homem'], ['f', 'Mulher']], v => { ger.gen = v; }, 'Gênero'),
            sel_('g:lugar', ger.lugar, [['', lug.length ? 'Nenhum lugar' : k.naMesa() ? 'Nenhum (o Mapa-múndi não tem lugares)' : 'Nenhum']].concat(lug.map(x => [chaveLugar(x), x.nome + ' · ' + x.sub])), v => { ger.lugar = v; }, 'Onde vive'),
            sel_('g:fac', ger.fac, [['', 'Nenhuma']].concat(fac.map(x => [chaveFac(x), x.nome + ' · ' + x.sub])), v => { ger.fac = v; }, 'Facção ou clã')),
          h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn pri', 'data-k': 'g:gerar', onclick: gerar }, ger.opcoes.length ? 'Gerar outras três' : 'Gerar três opções'),
            !rs.lista.length ? h('p', { class: 'ajuda', text: 'Monte a lista de raças (o botão Raças) para que os nomes e a aparência combinem com cada povo.' }) : null)),
        ger.opcoes.length ? h('div', { class: 'npc-ops' }, ger.opcoes.map(cartaoOpcao)) : null);
    }

    /* ---------------- as raças ---------------- */
    async function racasDasFichas() {
      const P = k.P();
      if (!P) return [];
      try { await P.pronta; } catch (e) { return []; }
      return N.racasDasFichas(P.todas().filter(l => !l.apagado && l.ficha).map(l => l.ficha));
    }
    function racasDlg() {
      const w = copia(racas().lista);
      const corpo = h('div', { class: 'corpo racas' });
      const estilos = (val, comRaca) => (comRaca ? [['', 'O da raça']] : []).concat(N.ORDEM_ESTILOS.map(e => [e, N.ESTILOS[e].nome])).map(o => h('option', { value: o[0], text: o[1], selected: (val || '') === o[0] ? true : null }));
      const pintarDlg = () => U.trocar(corpo,
        w.length ? w.map((r, i) => h('div', { class: 'raca', 'data-k': 'rc:' + i },
          h('div', { class: 'raca-l' },
            h('input', { class: 'in', 'data-k': 'rc:' + i + ':nome', value: r.nome, maxlength: 50, placeholder: 'Nome (ex.: Anão)', 'aria-label': 'O nome da raça', oninput: ev => { r.nome = ev.target.value; } }),
            h('select', { class: 'in', 'data-k': 'rc:' + i + ':estilo', 'aria-label': 'O estilo dos nomes', onchange: ev => { r.estilo = ev.target.value; } }, estilos(r.estilo, false)),
            h('button', { type: 'button', class: 'ib leve', 'data-k': 'rc:' + i + ':tirar', title: 'Tirar esta raça', 'aria-label': 'Tirar ' + (r.nome || 'esta raça'), onclick: () => { w.splice(i, 1); pintarDlg(); } }, '×')),
          h('input', { class: 'in', 'data-k': 'rc:' + i + ':ap', value: r.aparencia || '', maxlength: 300, placeholder: 'A aparência típica, separada por vírgulas (ex.: barba trançada, nariz largo)', 'aria-label': 'A aparência típica', oninput: ev => { r.aparencia = ev.target.value; } }),
          (r.subs || []).map((s, k2) => h('div', { class: 'sub-raca', 'data-k': 'rc:' + i + ':s' + k2 },
            h('input', { class: 'in', 'data-k': 'rc:' + i + ':s' + k2 + ':nome', value: s.nome, maxlength: 50, placeholder: 'Sub-raça (ex.: da Montanha)', 'aria-label': 'O nome da sub-raça', oninput: ev => { s.nome = ev.target.value; } }),
            h('select', { class: 'in', 'data-k': 'rc:' + i + ':s' + k2 + ':estilo', 'aria-label': 'O estilo dos nomes da sub-raça', onchange: ev => { s.estilo = ev.target.value || null; } }, estilos(s.estilo, true)),
            h('input', { class: 'in', 'data-k': 'rc:' + i + ':s' + k2 + ':ap', value: s.aparencia || '', maxlength: 300, placeholder: 'A aparência (soma à da raça)', 'aria-label': 'A aparência da sub-raça', oninput: ev => { s.aparencia = ev.target.value; } }),
            h('button', { type: 'button', class: 'ib leve', 'data-k': 'rc:' + i + ':s' + k2 + ':tirar', title: 'Tirar esta sub-raça', onclick: () => { r.subs.splice(k2, 1); pintarDlg(); } }, '×'))),
          (r.subs || []).length < 12 ? h('button', { type: 'button', class: 'btn xs tracejado', 'data-k': 'rc:' + i + ':nova-sub', onclick: () => { r.subs = r.subs || []; r.subs.push({ nome: '', estilo: null, aparencia: '' }); pintarDlg(); const x = corpo.querySelector('[data-k="rc:' + i + ':s' + (r.subs.length - 1) + ':nome"]'); if (x) x.focus(); } }, '+ Sub-raça') : null))
          : h('p', { class: 'ajuda', text: 'Nenhuma raça ainda. Cada raça diz o estilo dos nomes (nórdico, élfico, anão…) e a aparência típica; o gerador usa as duas.' }),
        h('div', { class: 'row' },
          w.length < 40 ? h('button', { type: 'button', class: 'btn sm', 'data-k': 'rc:nova', onclick: () => { w.push({ nome: '', estilo: 'latino', aparencia: '', subs: [] }); pintarDlg(); const x = corpo.querySelector('[data-k="rc:' + (w.length - 1) + ':nome"]'); if (x) x.focus(); } }, '+ Raça') : null,
          k.naMesa() ? h('button', { type: 'button', class: 'btn sm', 'data-k': 'rc:fichas', onclick: async () => {
            const nomes = await racasDasFichas(), tem = new Set(w.map(r => N.sem(r.nome)));
            const novas = nomes.filter(x => !tem.has(N.sem(x)));
            if (!novas.length) { toast(nomes.length ? 'As raças das fichas já estão na lista.' : 'As fichas da mesa não têm raça escrita.'); return; }
            for (const x of novas) if (w.length < 40) w.push({ nome: x, estilo: N.estiloPorNome(x), aparencia: '', subs: [] });
            pintarDlg();
            toast(novas.length === 1 ? 'Entrou ' + novas[0] + ' (o estilo dos nomes é um palpite: troque se quiser).' : 'Entraram ' + novas.length + ' raças das fichas (o estilo dos nomes é um palpite: troque se quiser).');
          } }, 'Trazer as raças das fichas') : null));
      pintarDlg();
      J.abrir('largo', [h('h2', { text: 'As raças da mesa' }), h('p', { text: 'O gerador de NPC tira o estilo dos nomes e a aparência daqui. A sub-raça herda o estilo da raça, a não ser que você escolha outro.' }), corpo,
        J.pe(h('button', { type: 'button', class: 'btn', 'data-k': 'rc:cancelar', onclick: () => J.fechar() }, 'Cancelar'),
          h('button', { type: 'button', class: 'btn pri', 'data-k': 'rc:ok', onclick: () => {
            const lista = w.filter(r => String(r.nome || '').trim()).map(r => Object.assign({}, r, { nome: r.nome.trim(), subs: (r.subs || []).filter(s => String(s.nome || '').trim()) }));
            k.mudar('mudar as raças', [N.RACAS], () => A.gravar(N.RACAS, N.normRacas({ lista })));
            J.fechar(); k.avisoDesfazer('As raças foram guardadas.');
          } }, 'Salvar'))]);
    }

    /* ---------------- as ações do NPC ---------------- */
    function virarFicha(id) {
      const n = npc(id);
      if (!n) return;
      const viva = fichaViva(n);
      if (viva) { if (!k.naCasca() || !TC.ponte.ir('fichas', { pc: viva.id })) toast('A ficha abre pelo site (a aba Fichas).'); return; }
      if (!k.naMesa() || !k.naCasca()) { toast('Numa mesa, pelo site, o NPC vira uma ficha nas Fichas com um clique.'); return; }
      const pc = 'npc' + Math.random().toString(36).slice(2, 9);
      const ds = N.descricao(n);
      const notas = [ds.quem + '.', 'Aparência: ' + ds.aparencia, 'Jeito: ' + ds.jeito, n.motivacao ? 'Quer: ' + n.motivacao + '.' : '', n.segredo ? 'Esconde: ' + n.segredo + '.' : '', n.gancho ? 'Gancho: ' + n.gancho : '', n.notas].filter(Boolean).join('\n');
      const ok = TC.ponte.ir('fichas', { npc: { id: pc, nome: n.nome, raca: n.raca ? n.raca.nome + (n.raca.sub ? ' ' + n.raca.sub : '') : '', tier: n.ficha.tier, level: n.ficha.nivel, tiers: n.ficha.tiers, lado: n.ficha.lado,
        grupo: n.fac ? nomeFac(n.fac) : n.lugar ? nomeLugar(n.lugar) : 'NPCs', notas, camp: n.camp, img: n.img } });
      if (!ok) { toast('A ficha nasce pelo site (a aba Fichas).'); return; }
      mudarN(id, 'ligar ' + n.nome + ' à ficha', x => { x.pc = pc; });
    }
    function token(id) {
      const n = npc(id);
      if (!n) return;
      if (!k.naCasca()) { toast('Pelo site, o NPC vira um token na cena aberta das Cenas.'); return; }
      const viva = fichaViva(n);
      if (!TC.ponte.ir('cenas', { npc: { nome: n.nome, pc: viva ? viva.id : null, img: n.img, ocultos: false } })) toast('O token nasce pelo site (a aba Cenas).');
    }
    function porNoRoteiro(id) {
      const n = npc(id);
      if (!n) return;
      const camp = k.campVista(), ss = A.sessoes();
      const alvo = A.sessaoAberta(camp) || E.proximaPlanejada(ss, camp);
      let sid = alvo ? alvo.id : null;
      const ids = sid ? [E.PRE.sessao + sid] : [];
      k.mudar('pôr ' + n.nome + ' no roteiro', ids, () => {
        if (!sid) sid = A.sessaoNova(camp);
        const s = A.sessao(sid);
        if (!s) return;
        s.passos.push(E.normPasso({ txt: 'Encontrar ' + n.nome, liga: { k: 'npc', id } }));
        A.gravarSessao(sid, s);
      });
      if (!alvo) { const ult = k.ultimoPasso && k.ultimoPasso(); if (ult && sid) ult.f.push({ id: E.PRE.sessao + sid, l: null }); }
      const s = A.sessao(sid);
      k.avisoDesfazer(n.nome + ' entrou no roteiro de ' + (s ? s.nome : 'uma sessão nova') + '.');
    }
    async function apagar(id) {
      const n = npc(id);
      if (!n) return;
      if (!(await J.confirmar('Apagar ' + n.nome + '?', 'A ficha que ele virou (se virou) fica nas Fichas. Tem Desfazer.', 'Apagar', true))) return;
      k.mudar('apagar ' + n.nome, [ID(id)], () => A.D.apagar(ID(id)));
      if (sel === id) sel = null;
      k.pintar();
      k.avisoDesfazer(n.nome + ' apagado.');
    }
    function outrosNomes(id) {
      const n = npc(id);
      if (!n) return;
      const nomes = N.nomes(n.estilo, n.gen, 9, N.novaSemente());
      J.abrir('', [h('h2', { text: 'Outros nomes' }), h('p', { text: N.ESTILOS[n.estilo].nome + ', ' + (n.gen === 'f' ? 'de mulher' : 'de homem') + '. Clique para trocar.' }),
        h('div', { class: 'nomes' }, nomes.map((x, i) => h('button', { type: 'button', class: 'btn sm', 'data-k': 'nm:' + i, onclick: () => { J.fechar(); mudarN(id, 'trocar o nome', y => { y.nome = x; }); } }, x))),
        J.pe(h('button', { type: 'button', class: 'btn', 'data-k': 'nm:outros', onclick: () => { J.fechar(); outrosNomes(id); } }, 'Outros'), h('button', { type: 'button', class: 'btn', 'data-k': 'nm:cancelar', onclick: () => J.fechar() }, 'Cancelar'))]);
    }
    // sortear de novo um campo (a partir das listas do gerador)
    function resortear(id, campo) {
      const n = npc(id);
      if (!n) return;
      const r = N.mulberry(N.novaSemente()), pick = l => l[Math.floor(r() * l.length)];
      const ctx = { lugar: n.lugar ? nomeLugar(n.lugar) : null, faccao: n.fac ? nomeFac(n.fac) : null };
      const rc = n.raca && n.raca.id ? racas().lista.find(x => x.id === n.raca.id) : null;
      const tipicos = rc ? [rc.aparencia].concat(rc.subs.filter(s => s.nome === (n.raca.sub || '')).map(s => s.aparencia)).join(',').split(/[,;\n]/).map(x => x.trim()).filter(Boolean) : [];
      const val = {
        corpo: () => N.g(pick(N.corposDe(n.estilo)), n.gen), cabelo: () => pick(N.CABELOS), marca: () => (tipicos.length && r() < 0.5 ? pick(tipicos) : pick(N.MARCAS)),
        roupa: () => pick(N.PAPEIS[n.papel].roupas), maneirismo: () => pick(N.MANEIRISMOS), fala: () => pick(N.FALAS),
        tracos: () => { const l = N.TRACOS.slice().sort(() => r() - 0.5).slice(0, 2 + (r() < 0.4 ? 1 : 0)); return l.map(x => N.g(x, n.gen)); },
        motivacao: () => N.preencher(N.g(pick(N.MOTIVACOES), n.gen), ctx), segredo: () => N.preencher(N.g(pick(N.SEGREDOS), n.gen), ctx), gancho: () => N.preencher(N.g(pick(N.GANCHOS), n.gen), ctx),
      }[campo];
      if (!val) return;
      let v = val();
      for (let i = 0; i < 4 && JSON.stringify(v) === JSON.stringify(n[campo]); i++) v = val();
      mudarN(id, 'sortear de novo', x => { x[campo] = v; });
    }

    /* ---------------- pintar ---------------- */
    function filtrados() {
      const q = N.sem(busca).trim();
      return npcs().filter(x => {
        if (fLugar && (fLugar === '-' ? x.n.lugar : chaveLugar(x.n.lugar) !== fLugar)) return false;
        if (fFac && (fFac === '-' ? x.n.fac : chaveFac(x.n.fac) !== fFac)) return false;
        if (!q) return true;
        const ds = N.descricao(x.n);
        return N.sem([x.n.nome, ds.quem, x.n.notas, nomeLugar(x.n.lugar), nomeFac(x.n.fac)].join(' ')).includes(q);
      });
    }
    function pintarLista() {
      const todos = npcs(), lista = filtrados();
      const usadosL = new Map(), usadosF = new Map();
      for (const x of todos) { if (x.n.lugar) usadosL.set(chaveLugar(x.n.lugar), nomeLugar(x.n.lugar)); if (x.n.fac) usadosF.set(chaveFac(x.n.fac), nomeFac(x.n.fac)); }
      if (fLugar && fLugar !== '-' && !usadosL.has(fLugar)) fLugar = '';
      if (fFac && fFac !== '-' && !usadosF.has(fFac)) fFac = '';
      const grupos = k.porCampanha(lista, x => x.n.camp);
      return h('nav', { class: 'lista', 'aria-label': 'Os NPCs' },
        h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn pri', 'data-k': 'npc:gerar', onclick: abrirGerador }, '+ Gerar NPC'),
          h('button', { type: 'button', class: 'btn', 'data-k': 'npc:racas', onclick: racasDlg }, 'Raças')),
        todos.length ? h('input', { class: 'in', 'data-k': 'npc:busca', type: 'search', placeholder: 'Buscar um NPC…', value: busca, 'aria-label': 'Buscar um NPC', oninput: ev => { busca = ev.target.value; k.pintar(); } }) : null,
        usadosL.size ? h('select', { class: 'in', 'data-k': 'npc:f-lugar', 'aria-label': 'Filtrar por lugar', onchange: ev => { fLugar = ev.target.value; k.pintar(); } },
          [['', 'Todos os lugares'], ['-', 'Sem lugar']].concat([...usadosL].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))).map(o => h('option', { value: o[0], text: o[1], selected: fLugar === o[0] ? true : null }))) : null,
        usadosF.size ? h('select', { class: 'in', 'data-k': 'npc:f-fac', 'aria-label': 'Filtrar por facção ou clã', onchange: ev => { fFac = ev.target.value; k.pintar(); } },
          [['', 'Todas as facções e clãs'], ['-', 'Sem facção']].concat([...usadosF].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))).map(o => h('option', { value: o[0], text: o[1], selected: fFac === o[0] ? true : null }))) : null,
        grupos.map(g => [g.nome ? h('div', { class: 'grupo', text: g.nome }) : null, g.itens.map(x => {
          const ds = N.descricao(x.n), onde = [nomeLugar(x.n.lugar), nomeFac(x.n.fac)].filter(Boolean).join(' · ');
          return h('button', { type: 'button', class: 'item', 'data-k': 'npc:' + x.id, 'aria-current': String(modo === 'lista' && x.id === sel), onclick: () => { selecionar(x.id); k.pintar(); } },
            h('span', { class: 'ico' }, icone(k.ICO.npc, 18)), h('span', { class: 'nm' }, h('b', { text: x.n.nome }), h('small', { text: ds.quem.replace(/, \d+ anos$/, '') + (onde ? ' · ' + onde : '') })));
        })]),
        !todos.length ? h('p', { class: 'ajuda', text: 'Gere um NPC: saem três opções (nome, aparência, jeito, o que quer e esconde, os números) e você fica com uma.' })
          : !lista.length ? h('p', { class: 'ajuda', text: 'Nenhum NPC com essa busca.' }) : null);
    }
    function pintarNpc(id) {
      const n = npc(id);
      const ds = N.descricao(n), viva = fichaViva(n), rs = racas().lista, lug = lugares(), fac = faccoes();
      const campo = (c, rot, max, area) => h('label', { class: 'field' }, h('span', { class: 'rot' }, rot,
        ['corpo', 'cabelo', 'marca', 'roupa', 'maneirismo', 'fala', 'tracos', 'motivacao', 'segredo', 'gancho'].includes(c) ? h('button', { type: 'button', class: 'ib leve mini', 'data-k': 'n:' + c + ':sortear', title: 'Sortear outro', 'aria-label': 'Sortear outro: ' + rot.toLowerCase(), onclick: ev => { ev.preventDefault(); resortear(id, c); } }, '↻') : null),
        h(area ? 'textarea' : 'input', { class: 'in', rows: area ? 2 : null, 'data-k': 'n:' + c, value: c === 'tracos' ? n.tracos.join(', ') : n[c], maxlength: max,
          oninput: ev => mudarN(id, 'escrever ' + rot.toLowerCase(), x => { x[c] = c === 'tracos' ? ev.target.value.split(',').map(t => t.trim()).filter(Boolean) : ev.target.value; }, 'n:' + id + ':' + c) }));
      const seg = (k_, val, ops, on, rot) => h('div', { class: 'field' }, h('span', { text: rot }), h('div', { class: 'seg', role: 'group', 'aria-label': rot }, ops.map(o => h('button', { type: 'button', 'data-k': k_ + ':' + o[0], 'aria-pressed': String(val === o[0]), onclick: () => on(o[0]) }, o[1]))));
      // os números: as barras pelas contas das fichas (o Bestiário faz a conta)
      let barras = '';
      try {
        const B = k.B;
        if (B) { const c = B.contas(B.normalizar({ nome: n.nome, ficha: { tier: n.ficha.tier, level: n.ficha.nivel, tiers: n.ficha.tiers, lado: n.ficha.lado } }), k.cfg()); barras = c.barras.map(b => b.n + ' ' + b.m).join(' · '); }
      } catch (e) { barras = ''; }
      const naLista = !!(n.raca && n.raca.id && rs.some(r => r.id === n.raca.id));
      const opsRaca = [['', 'Sem raça']].concat(n.raca && !naLista ? [['_', n.raca.nome + ' (fora da lista)']] : []).concat(rs.map(r => [r.id, r.nome]));
      const racaVal = n.raca ? (naLista ? n.raca.id : '_') : '';
      const rc = n.raca && n.raca.id ? rs.find(r => r.id === n.raca.id) : null;
      return h('section', { class: 'det', 'aria-label': n.nome },
        h('div', { class: 'cab' },
          h('input', { class: 'in nome', 'data-k': 'n:nome', value: n.nome, maxlength: 80, 'aria-label': 'O nome', oninput: ev => mudarN(id, 'renomear', x => { x.nome = ev.target.value || 'NPC'; }, 'n:' + id + ':nome') }),
          h('button', { type: 'button', class: 'btn sm', 'data-k': 'n:nomes', onclick: () => outrosNomes(id) }, 'Outros nomes')),
        h('p', { class: 'quem-g', text: ds.quem }),
        h('div', { class: 'row' },
          h('button', { type: 'button', class: 'btn pri sm', 'data-k': 'n:ficha', onclick: () => virarFicha(id) }, viva ? 'Abrir a ficha' : 'Virar ficha'),
          h('button', { type: 'button', class: 'btn sm', 'data-k': 'n:token', onclick: () => token(id) }, 'Token na cena'),
          h('button', { type: 'button', class: 'btn sm', 'data-k': 'n:roteiro', onclick: () => porNoRoteiro(id) }, 'Pôr no roteiro'),
          h('span', { class: 'grow' }),
          viva ? h('span', { class: 'badge ok', text: 'Tem ficha' }) : null,
          h('button', { type: 'button', class: 'btn per sm', 'data-k': 'n:apagar', onclick: () => apagar(id) }, 'Apagar')),
        h('div', { class: 'npc-grade' },
          h('div', { class: 'cartao' }, h('h3', { class: 'sub', text: 'Quem é' }),
            h('div', { class: 'duas' },
              h('label', { class: 'field' }, h('span', { text: 'Raça' }), h('select', { class: 'in', 'data-k': 'n:raca', onchange: ev => {
                const v = ev.target.value, r = rs.find(y => y.id === v);
                if (v === '_') return;
                mudarN(id, 'trocar a raça', x => { if (!r) { x.raca = null; return; } x.raca = { id: r.id, nome: r.nome, sub: '' }; x.estilo = r.estilo; });
              } }, opsRaca.map(o => h('option', { value: o[0], text: o[1], selected: racaVal === o[0] ? true : null })))),
              rc && rc.subs.length ? h('label', { class: 'field' }, h('span', { text: 'Sub-raça' }), h('select', { class: 'in', 'data-k': 'n:sub', onchange: ev => mudarN(id, 'trocar a sub-raça', x => { if (x.raca) x.raca.sub = ev.target.value; const s = rc.subs.find(y => y.nome === ev.target.value); if (s && s.estilo) x.estilo = s.estilo; else x.estilo = rc.estilo; }) },
                [['', 'Nenhuma']].concat(rc.subs.map(s => [s.nome, s.nome])).map(o => h('option', { value: o[0], text: o[1], selected: (n.raca.sub || '') === o[0] ? true : null })))) : null,
              h('label', { class: 'field' }, h('span', { text: 'Papel' }), h('select', { class: 'in', 'data-k': 'n:papel', onchange: ev => mudarN(id, 'trocar o papel', x => { x.papel = ev.target.value; }) },
                N.ORDEM_PAPEIS.map(p => h('option', { value: p, text: N.g(N.PAPEIS[p].nome, n.gen), selected: n.papel === p ? true : null })))),
              h('label', { class: 'field' }, h('span', { text: 'Idade' }), h('input', { class: 'in', type: 'number', min: 1, max: 2000, 'data-k': 'n:idade', value: String(n.idade), onchange: ev => mudarN(id, 'mudar a idade', x => { x.idade = ev.target.value; }) })),
              h('label', { class: 'field' }, h('span', { text: 'Estilo do nome' }), h('select', { class: 'in', 'data-k': 'n:estilo', onchange: ev => mudarN(id, 'trocar o estilo', x => { x.estilo = ev.target.value; }) },
                N.ORDEM_ESTILOS.map(e => h('option', { value: e, text: N.ESTILOS[e].nome, selected: n.estilo === e ? true : null }))))),
            seg('n:gen', n.gen, [['m', 'Homem'], ['f', 'Mulher']], v => mudarN(id, 'trocar o gênero', x => { if (x.gen === v) return; x.gen = v; x.tracos = x.tracos.map(t => { const par = N.TRACOS.find(p => Array.isArray(p) && p.includes(t)); return par ? N.g(par, v) : t; }); const cp = N.CORPOS.find(p => p.includes(x.corpo)); if (cp) x.corpo = N.g(cp, v); }), 'Gênero')),
          h('div', { class: 'cartao' }, h('h3', { class: 'sub', text: 'Aparência' }), campo('corpo', 'Corpo', 80), campo('cabelo', 'Cabelo', 120), campo('marca', 'Uma marca', 160), campo('roupa', 'Roupa', 160)),
          h('div', { class: 'cartao' }, h('h3', { class: 'sub', text: 'Jeito' }), campo('tracos', 'Personalidade (separada por vírgulas)', 200), campo('maneirismo', 'Um maneirismo', 160), campo('fala', 'Como fala', 160)),
          h('div', { class: 'cartao' }, h('h3', { class: 'sub', text: 'O que quer, o que esconde' }), campo('motivacao', 'Motivação', 240, true), campo('segredo', 'Segredo (só você sabe)', 240, true), campo('gancho', 'Gancho de aventura', 300, true)),
          h('div', { class: 'cartao' }, h('h3', { class: 'sub', text: 'Números de ficha' }),
            seg('n:tier', n.ficha.tier, N.TIERS.map(t => [t, t]), v => mudarN(id, 'trocar o tier', x => { x.ficha.tier = v; }), 'Tier'),
            h('div', { class: 'duas' },
              h('label', { class: 'field' }, h('span', { text: 'Level' }), h('input', { class: 'in', type: 'number', min: 1, max: 30, 'data-k': 'n:nivel', value: String(n.ficha.nivel), onchange: ev => mudarN(id, 'mudar o level', x => { x.ficha.nivel = ev.target.value; }) })),
              h('label', { class: 'field' }, h('span', { text: 'Lado' }), h('select', { class: 'in', 'data-k': 'n:lado', onchange: ev => mudarN(id, 'trocar o lado', x => { x.ficha.lado = ev.target.value; }) }, N.LADOS.map(l => h('option', { value: l, text: l, selected: n.ficha.lado === l ? true : null }))))),
            h('div', { class: 'atrs' }, N.ATRIBUTOS.map(a => h('label', { class: 'field' }, h('span', { text: a }), h('select', { class: 'in', 'data-k': 'n:at:' + a, onchange: ev => mudarN(id, 'mudar ' + a, x => { x.ficha.tiers[a] = ev.target.value; }) },
              N.LETRAS.map(L => h('option', { value: L, text: L, selected: n.ficha.tiers[a] === L ? true : null })))))),
            barras ? h('p', { class: 'ajuda', 'data-k': 'n:barras', text: 'Pelas contas das fichas: ' + barras + '.' }) : null),
          h('div', { class: 'cartao' }, h('h3', { class: 'sub', text: 'Onde e de que lado' }),
            h('label', { class: 'field' }, h('span', { text: 'Onde vive' }), h('select', { class: 'in', 'data-k': 'n:lugar', onchange: ev => { const x0 = lug.find(y => chaveLugar(y) === ev.target.value); mudarN(id, 'trocar o lugar', x => { x.lugar = x0 ? { mapa: x0.mapa, obj: x0.obj, nome: x0.nome } : null; }); } },
              [['', 'Nenhum lugar']].concat(n.lugar && !lug.some(y => chaveLugar(y) === chaveLugar(n.lugar)) ? [[chaveLugar(n.lugar), (n.lugar.nome || 'Lugar') + ' (não está mais no mapa)']] : []).concat(lug.map(y => [chaveLugar(y), y.nome + ' · ' + y.sub])).map(o => h('option', { value: o[0], text: o[1], selected: chaveLugar(n.lugar) === o[0] ? true : null })))),
            h('label', { class: 'field' }, h('span', { text: 'Facção ou clã' }), h('select', { class: 'in', 'data-k': 'n:fac', onchange: ev => { const x0 = fac.find(y => chaveFac(y) === ev.target.value); mudarN(id, 'trocar a facção', x => { x.fac = x0 ? { k: x0.k, id: x0.id, nome: x0.nome, mapa: x0.mapa || null } : null; }); } },
              [['', 'Nenhuma']].concat(n.fac && !fac.some(y => chaveFac(y) === chaveFac(n.fac)) ? [[chaveFac(n.fac), (n.fac.nome || 'Facção') + ' (não existe mais)']] : []).concat(fac.map(y => [chaveFac(y), y.nome + ' · ' + y.sub])).map(o => h('option', { value: o[0], text: o[1], selected: chaveFac(n.fac) === o[0] ? true : null })))),
            n.lugar && k.naCasca() ? h('button', { type: 'button', class: 'link', 'data-k': 'n:ver-lugar', onclick: () => TC.ponte.ir('mundo', { mapa: n.lugar.mapa, obj: n.lugar.obj }) }, 'Ver ' + nomeLugar(n.lugar) + ' no mapa') : null,
            k.temCampanhas() ? h('label', { class: 'field' }, h('span', { text: 'Campanha' }), h('select', { class: 'in', 'data-k': 'n:camp', onchange: ev => mudarN(id, 'trocar a campanha', x => { x.camp = ev.target.value || null; }) },
              h('option', { value: '', text: 'Do mundo (todas)', selected: !n.camp ? true : null }), k.campanhas().map(c => h('option', { value: c.id, text: c.nome, selected: n.camp === c.id ? true : null })))) : null),
          h('div', { class: 'cartao larga' }, h('h3', { class: 'sub', text: 'Notas' }), h('textarea', { class: 'in', rows: 4, 'data-k': 'n:notas', value: n.notas, maxlength: 4000, placeholder: 'O que mais lembrar deste NPC (só você vê)…', 'aria-label': 'As notas do NPC', oninput: ev => mudarN(id, 'escrever as notas', x => { x.notas = ev.target.value; }, 'n:' + id + ':notas') }))));
    }
    function pintar() {
      if (sel && !npc(sel)) sel = null;
      const lista = pintarLista();
      if (modo === 'gerar') return h('div', { class: 'cols' }, lista, pintarGerador());
      if (sel) return h('div', { class: 'cols' }, lista, pintarNpc(sel));
      return h('div', { class: 'cols' }, lista, h('div', { class: 'vazio' }, h('p', { class: 'tit', text: 'Os NPCs' }),
        h('p', { text: 'Gere quem os jogadores encontram: o nome no estilo do povo dele, a aparência, o jeito, o que quer e o que esconde, o gancho e os números de ficha. Um clique faz dele uma ficha ou um token na cena.' }),
        h('button', { type: 'button', class: 'btn pri', 'data-k': 'npc:gerar2', onclick: abrirGerador }, 'Gerar um NPC')));
    }

    return { pintar, selecionar, npcs, npc, gerar, abrirGerador, racasDlg, virarFicha, token, porNoRoteiro, ger, get sel() { return sel; }, get modo() { return modo; } };
  };
})();
