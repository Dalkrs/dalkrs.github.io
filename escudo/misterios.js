/* Tiny Cats · Escudo do mestre (lote 53): os mistérios.
   À esquerda, os casos; à direita, o caso aberto — ou o gerador: o tipo (assassinato, roubo ou sumiço, desaparecimento,
   maldição, licantropo, vampiro, íncubo ou súcubo, criaturas sombrias), quantos suspeitos, a pista falsa e a reviravolta.
   O caso tem a verdade (só o mestre vê), os suspeitos (com o álibi, se mente, o segredo e o que cada um sabe) e as
   pistas de cada conclusão, três por conclusão (a regra das três pistas). "Abrir à mesa" põe o caso nas Pistas de
   quem joga, com o mural do grupo; daí em diante o mestre entrega as pistas (aqui, ou revelando a marca na cena do
   crime), mostra os suspeitos (o interrogatório: as respostas que o grupo arrancou) e confirma ou não a acusação do
   grupo. Nada vai para a mesa sem um clique do mestre, e tudo tem Desfazer. Para a página: window.EscudoMisterios(kit). */
(() => {
  'use strict';
  window.EscudoMisterios = function (k) {
    const { E, U, A, J, toast } = k;
    const M = window.TC.misterio, N = k.N;
    const { h, icone } = U;
    const copia = x => (x == null ? x : JSON.parse(JSON.stringify(x)));
    const ID = cid => M.PRE.caso + cid;
    let sel = U.guarda.ler('tinycats:escudo:caso') || null, modo = 'lista';
    const ger = { tipo: 'assassinato', n: 4, falsa: true, reviravolta: true, seed: M.novaSemente(), caso: null };
    function selecionar(id) { sel = id; modo = 'lista'; U.guarda.gravar('tinycats:escudo:caso', id); }

    /* ---------------- os casos ---------------- */
    function casos() {
      return A.D.todas().filter(l => !l.apagado && typeof l.id === 'string' && l.id.startsWith(M.PRE.caso) && M.idOk(l.id.slice(M.PRE.caso.length)))
        .map(l => ({ id: l.id.slice(M.PRE.caso.length), c: M.normCaso(l.dados) })).sort((a, b) => String(b.c.em || '').localeCompare(String(a.c.em || '')));
    }
    const caso = cid => { const d = A.dadosDe(ID(cid)); return d ? M.normCaso(d) : null; };
    const pubDe = (cid, c) => { const d = A.dadosDe(M.idPub(cid, c.camp)); return d ? M.normPub(d) : null; };
    const muralDe = (cid, c) => { const d = A.dadosDe(M.idMural(cid, c.camp)); return d ? M.normMural(d) : null; };
    const idsDe = (cid, c) => [ID(cid), M.idPub(cid, c.camp), M.idMural(cid, c.camp)];
    // grava o caso e, se ele está aberto à mesa, refaz o que a mesa vê
    function gravarCaso(cid, c) {
      c = M.normCaso(c);
      A.gravar(ID(cid), c);
      if (c.aberto) A.gravar(M.idPub(cid, c.camp), M.projetar(cid, c, A.dadosDe(M.idPub(cid, c.camp))), { vis: 'mesa' });
    }
    function mudarC(cid, rotulo, fn, chaveTexto) {
      const c = caso(cid); if (!c) return;
      const ids = idsDe(cid, c);
      const go = () => { const x = copia(c); fn(x); gravarCaso(cid, x); };
      if (chaveTexto) k.mudarTexto(chaveTexto, rotulo, ids, go); else k.mudar(rotulo, ids, go);
    }

    /* ---------------- o gerador ---------------- */
    function sortear() { ger.caso = M.gerarCaso({ tipo: ger.tipo, n: ger.n, falsa: ger.falsa, reviravolta: ger.reviravolta }, ger.seed, { npc: N }); }
    function abrirGerador() { modo = 'gerar'; ger.seed = M.novaSemente(); sortear(); k.pintar(); }
    function guardarGerado() {
      if (!ger.caso) return;
      const cid = M.novoId('c'), c = Object.assign(copia(ger.caso), { camp: k.campVista(), em: new Date().toISOString() });
      k.mudar('criar o caso ' + c.titulo, [ID(cid)], () => A.gravar(ID(cid), M.normCaso(c)));
      selecionar(cid); k.pintar();
      k.avisoDesfazer('Caso guardado: “' + c.titulo + '”. Ele ainda não aparece para a mesa — use “Abrir à mesa” quando o grupo chegar ao caso.');
    }
    function pintarGerador() {
      const c = ger.caso, T = M.TIPOS[ger.tipo];
      const seg = (kk, val, ops, on, rot) => h('div', { class: 'field' }, h('span', { text: rot }), h('div', { class: 'seg', role: 'group', 'aria-label': rot },
        ops.map(o => h('button', { type: 'button', 'data-k': kk + ':' + o[0], 'aria-pressed': String(val === o[0]), onclick: () => on(o[0]) }, o[1]))));
      const muda = (campo, v) => { ger[campo] = v; sortear(); k.pintar(); };
      const nomeS = sid => { const s = c && c.suspeitos.find(x => x.id === sid); return s ? s.nome : ''; };
      return h('section', { class: 'det', 'aria-label': 'Gerar um caso' },
        h('div', { class: 'cab' }, h('h2', { class: 'tit', text: 'Gerar um caso' })),
        h('div', { class: 'cartao' },
          seg('mg:tipo', ger.tipo, M.ORDEM_TIPOS.map(t => [t, M.TIPOS[t].n]), v => muda('tipo', v), 'O tipo'),
          h('div', { class: 'row' },
            seg('mg:n', ger.n, [[3, '3'], [4, '4'], [5, '5']], v => muda('n', v), 'Suspeitos'),
            h('label', { class: 'chk' }, h('input', { type: 'checkbox', 'data-k': 'mg:falsa', checked: ger.falsa ? true : null, disabled: !T.con.includes('quem') ? true : null, onchange: ev => muda('falsa', ev.target.checked) }), 'Pista falsa (aponta um inocente)'),
            h('label', { class: 'chk' }, h('input', { type: 'checkbox', 'data-k': 'mg:revira', checked: ger.reviravolta ? true : null, onchange: ev => muda('reviravolta', ev.target.checked) }), 'Reviravolta')),
          h('div', { class: 'row' },
            h('button', { type: 'button', class: 'btn', 'data-k': 'mg:outro', onclick: () => { ger.seed = M.novaSemente(); sortear(); k.pintar(); } }, 'Sortear de novo'),
            h('span', { class: 'ajuda', text: 'Semente ' + ger.seed + ': a mesma semente, com as mesmas escolhas, dá o mesmo caso.' }))),
        c ? h('div', { class: 'cartao', 'data-k': 'mg:previa' },
          h('b', { class: 'mg-tit', text: c.titulo }),
          h('p', { class: 'ajuda', text: 'A vítima: ' + c.verdade.vitima + '. Cena do crime sugerida: ' + M.CENAS[c.cena] + '.' }),
          h('ul', { class: 'mg-verdade' }, M.conclusoes(c).map(con => h('li', {}, h('b', { text: M.CONCLUSOES[con] + ': ' }), con === 'quem' ? nomeS(c.verdade.quem) : (c.verdade[con] || '')))),
          h('p', { class: 'ajuda', text: 'Suspeitos: ' + c.suspeitos.map(s => s.nome + (s.culpado ? ' (culpado)' : '')).join(', ') + '. ' + c.pistas.length + ' pistas' + (c.pistas.some(p => p.falsa) ? ', uma falsa' : '') + (c.reviravolta ? ', e uma reviravolta' : '') + '.' })) : null,
        h('div', { class: 'row' },
          h('button', { type: 'button', class: 'btn pri', 'data-k': 'mg:guardar', onclick: guardarGerado }, 'Guardar o caso'),
          h('button', { type: 'button', class: 'btn', 'data-k': 'mg:cancelar', onclick: () => { modo = 'lista'; k.pintar(); } }, 'Cancelar')));
    }

    /* ---------------- a mesa: abrir, entregar, mostrar, o veredito ---------------- */
    function abrirAMesa(cid) {
      const c = caso(cid); if (!c) return;
      const ids = idsDe(cid, c);
      k.mudar(c.aberto ? 'tirar ' + c.titulo + ' da mesa' : 'abrir ' + c.titulo + ' à mesa', ids, () => {
        const x = copia(c);
        if (x.aberto) { x.aberto = false; A.gravar(ID(cid), M.normCaso(x)); if (A.linhaViva(M.idPub(cid, x.camp))) A.D.apagar(M.idPub(cid, x.camp)); return; }
        x.aberto = true; if (x.estado === 'preparo') x.estado = 'aberto';
        gravarCaso(cid, x);
        if (!A.linhaViva(M.idMural(cid, x.camp))) A.gravar(M.idMural(cid, x.camp), M.normMural({ cid }), { vis: 'mesa' });
      });
      k.avisoDesfazer(c.aberto ? '“' + c.titulo + '” saiu das Pistas da mesa (o mural fica guardado).' : '“' + c.titulo + '” está nas Pistas da mesa, com o mural do grupo. Entregue as pistas quando o grupo as achar.');
    }
    function entregar(cid, pid, de) {
      const c = caso(cid); if (!c) return;
      const p = c.pistas.find(x => x.id === pid); if (!p) return;
      if (!c.aberto && !de) { toast('Abra o caso à mesa primeiro (“Abrir à mesa”).'); return; }
      mudarC(cid, p.entregue ? 'recolher uma pista' : 'entregar uma pista', x => { const y = p.entregue ? M.recolher(x, pid) : M.entregar(x, pid); Object.assign(x, y); });
      k.avisoDesfazer(p.entregue ? 'A pista saiu das Pistas da mesa.' : 'Pista entregue: o grupo a vê nas Pistas, no caso “' + c.titulo + '”.');
    }
    function mostrarSuspeito(cid, sid) {
      const c = caso(cid), s = c && c.suspeitos.find(x => x.id === sid); if (!s) return;
      if (!c.aberto && !s.mostrado) { toast('Abra o caso à mesa primeiro (“Abrir à mesa”).'); return; }
      mudarC(cid, (s.mostrado ? 'esconder ' : 'mostrar ') + s.nome, x => { const y = x.suspeitos.find(z => z.id === sid); y.mostrado = !y.mostrado; });
    }
    function responder(cid, sid, txt) {
      txt = M.linha(txt, 300); if (!txt) return;
      const c = caso(cid), s = c && c.suspeitos.find(x => x.id === sid); if (!s) return;
      mudarC(cid, 'anotar uma resposta de ' + s.nome, x => { const y = x.suspeitos.find(z => z.id === sid); y.respostas.push(txt); y.mostrado = true; });
    }
    function tirarResposta(cid, sid, i) { mudarC(cid, 'tirar uma resposta', x => { const y = x.suspeitos.find(z => z.id === sid); if (y) y.respostas.splice(i, 1); }); }
    function veredito(cid, ok) {
      const c = caso(cid), m = c && muralDe(cid, c); if (!c || !m || !m.acusacao) return;
      const s = c.suspeitos.find(x => x.id === m.acusacao.sid);
      const ids = idsDe(cid, c);
      k.mudar(ok ? 'confirmar a acusação' : 'recusar a acusação', ids, () => {
        const x = copia(c); x.estado = ok ? 'resolvido' : 'aberto';
        A.gravar(ID(cid), M.normCaso(x));
        const pub = Object.assign(M.projetar(cid, x, A.dadosDe(M.idPub(cid, x.camp))), { veredito: { ok, sid: m.acusacao.sid, txt: ok ? 'Acertaram: foi ' + (s ? s.nome : 'quem vocês apontaram') + '.' : 'Não foi ' + (s ? s.nome : 'quem vocês apontaram') + '. O caso continua.', em: new Date().toISOString() } });
        A.gravar(M.idPub(cid, x.camp), pub, { vis: 'mesa' });
      });
      k.avisoDesfazer(ok ? 'O grupo sabe que acertou: o caso está resolvido.' : 'O grupo sabe que errou; o caso continua aberto.');
    }
    function apagar(cid) {
      const c = caso(cid); if (!c) return;
      J.confirmar('Apagar “' + c.titulo + '”?', 'O caso sai do Escudo e das Pistas da mesa, com o mural. Dá para desfazer logo depois.', 'Apagar', true).then(sim => {
        if (!sim) return;
        k.mudar('apagar ' + c.titulo, idsDe(cid, c), () => { for (const id of idsDe(cid, c)) if (A.linhaViva(id)) A.D.apagar(id); });
        sel = null; k.pintar(); k.avisoDesfazer('“' + c.titulo + '” apagado.');
      });
    }
    // a cena do crime: as Cenas abrem "Gerar um lugar" na aba Cena do crime, já com este caso
    function cenaDoCrime(cid) {
      const c = caso(cid); if (!c) return;
      if (!k.naCasca()) { toast('Pelo site, a cena do crime abre nas Cenas.'); return; }
      if (!TC.ponte.ir('cenas', { gerar: { lugar: 'crime', op: { cenario: c.cena }, misterio: cid, nome: c.titulo } })) toast('A cena nasce pelo site (a aba Cenas).');
    }
    function virarNpc(cid, sid) {
      const c = caso(cid), s = c && c.suspeitos.find(x => x.id === sid); if (!s || !N) return;
      const nid = N.novoId ? N.novoId('n') : M.novoId('n');
      const n = N.normNpc(Object.assign({}, s.npc || { nome: s.nome }, { nome: s.nome, notas: [s.aparencia, 'Álibi: ' + s.alibi, s.segredo ? 'Esconde: ' + s.segredo : ''].filter(Boolean).join('\n'), camp: c.camp, em: new Date().toISOString() }));
      k.mudar('guardar ' + s.nome + ' nos NPCs', [N.PRE + nid], () => A.gravar(N.PRE + nid, n));
      k.avisoDesfazer(s.nome + ' está nos NPCs do Escudo.');
    }

    /* ---------------- pintar ---------------- */
    const BADGE = { preparo: ['Em preparo', ''], aberto: ['Na mesa', 'ok'], resolvido: ['Resolvido', 'ouro'] };
    function pintarLista() {
      const todos = casos(), grupos = k.porCampanha(todos, x => x.c.camp);
      return h('nav', { class: 'lista', 'aria-label': 'Os casos' },
        h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn pri', 'data-k': 'mi:novo', onclick: abrirGerador }, '+ Caso')),
        grupos.map(g => [g.nome ? h('div', { class: 'grupo', text: g.nome }) : null, g.itens.map(x => h('button', { type: 'button', class: 'item', 'data-k': 'mi:' + x.id, 'aria-current': String(modo === 'lista' && x.id === sel), onclick: () => { selecionar(x.id); k.pintar(); } },
          h('span', { class: 'ico' }, icone(k.ICO.misterio || k.ICO.npc, 18)), h('span', { class: 'nm' }, h('b', { text: x.c.titulo }), h('small', { text: M.TIPOS[x.c.tipo].n + ' · ' + BADGE[x.c.estado][0] }))))]),
        !todos.length ? h('p', { class: 'ajuda', text: 'Gere um caso: o culpado, o motivo e o método, os suspeitos com álibi e segredo, e três pistas para cada conclusão.' }) : null);
    }
    function pintarCaso(cid) {
      const c = caso(cid), pub = c.aberto ? pubDe(cid, c) : null, mural = muralDe(cid, c);
      const nomeS = sid => { const s = c.suspeitos.find(x => x.id === sid); return s ? s.nome : '—'; };
      const hora = iso => (iso ? U.hora(iso) : '');
      const acus = mural && mural.acusacao, vd = pub && pub.veredito;
      const pendente = acus && (!vd || String(vd.em || '') < String(acus.em || ''));
      const verdade = h('div', { class: 'cartao', 'data-k': 'mc:verdade' },
        h('b', { text: 'A verdade (só você vê)' }),
        h('p', {}, h('b', { text: 'Vítima: ' }), c.verdade.vitima),
        M.conclusoes(c).map(con => h('p', {}, h('b', { text: M.CONCLUSOES[con] + ': ' }), con === 'quem' ? nomeS(c.verdade.quem) : (c.verdade[con] || '—'))),
        c.reviravolta ? h('div', { class: 'mc-revira' }, h('p', {}, h('b', { text: 'Reviravolta: ' }), c.reviravolta.txt),
          h('label', { class: 'chk' }, h('input', { type: 'checkbox', 'data-k': 'mc:revira', checked: c.reviravolta.usada ? true : null, onchange: ev => mudarC(cid, 'marcar a reviravolta', x => { x.reviravolta.usada = ev.target.checked; }) }), 'Já usei a reviravolta')) : null);
      const susp = h('div', { class: 'cartao', 'data-k': 'mc:suspeitos' },
        h('b', { text: 'Suspeitos' }),
        h('div', { class: 'mc-susp' }, c.suspeitos.map(s => {
          const falsaAponta = c.pistas.some(p => p.falsa && p.aponta === s.id);
          let inR = null;
          return h('div', { class: 'npc-op', 'data-k': 'ms:' + s.id },
            h('div', { class: 'row' }, h('b', { text: s.nome }), s.culpado ? h('span', { class: 'badge ouro', text: 'culpado' }) : null, falsaAponta ? h('span', { class: 'badge ruim', text: 'a pista falsa aponta' }) : null, s.mostrado ? h('span', { class: 'badge ok', text: 'a mesa vê' }) : null),
            h('p', { class: 'ajuda', text: s.quem }), s.aparencia ? h('p', { text: s.aparencia }) : null,
            h('p', {}, h('b', { text: 'Álibi: ' }), s.alibi, s.mente ? h('span', { class: 'ruim-t', text: ' Mente. ' + s.desmente }) : null),
            s.segredo ? h('p', {}, h('b', { text: 'Esconde: ' }), s.segredo) : null,
            s.sabe.length ? h('p', {}, h('b', { text: 'Sabe: ' }), s.sabe.map(pid => { const p = c.pistas.find(x => x.id === pid); return p ? (/^["“]/.test(p.txt) ? p.txt : '“' + p.txt + '”') + ' ' : ''; })) : null,
            s.respostas.length ? h('ul', { class: 'mc-resp' }, s.respostas.map((r, i) => h('li', {}, r, ' ', h('button', { type: 'button', class: 'ib leve mini', 'data-k': 'ms:' + s.id + ':tirar:' + i, title: 'Tirar esta resposta', 'aria-label': 'Tirar esta resposta', onclick: () => tirarResposta(cid, s.id, i) }, '×')))) : null,
            h('div', { class: 'row' },
              h('button', { type: 'button', class: 'btn xs', 'data-k': 'ms:' + s.id + ':mostrar', onclick: () => mostrarSuspeito(cid, s.id) }, s.mostrado ? 'Esconder da mesa' : 'Mostrar à mesa'),
              N ? h('button', { type: 'button', class: 'btn xs', 'data-k': 'ms:' + s.id + ':npc', onclick: () => virarNpc(cid, s.id) }, 'Guardar nos NPCs') : null),
            s.mostrado ? h('div', { class: 'row' },
              inR = h('input', { class: 'in', 'data-k': 'ms:' + s.id + ':resp', placeholder: 'O que o grupo arrancou no interrogatório…', maxlength: 300, onkeydown: ev => { if (ev.key === 'Enter') { ev.preventDefault(); responder(cid, s.id, ev.target.value); } } }),
              h('button', { type: 'button', class: 'btn xs', 'data-k': 'ms:' + s.id + ':resp-ok', onclick: () => responder(cid, s.id, inR.value) }, 'Anotar')) : null);
        })));
      const pistas = h('div', { class: 'cartao', 'data-k': 'mc:pistas' },
        h('b', { text: 'Pistas (três para cada conclusão)' }),
        M.conclusoes(c).map(con => h('div', { class: 'mc-con' }, h('span', { class: 'mc-con-t', text: M.CONCLUSOES[con] }),
          c.pistas.filter(p => p.con === con).map(p => h('div', { class: 'mc-pista' + (p.entregue ? ' entregue' : ''), 'data-k': 'mp:' + p.id },
            h('div', { class: 'row' }, h('span', { class: 'badge', text: M.JEITOS[p.jeito] }), p.falsa ? h('span', { class: 'badge ruim', text: 'falsa' }) : null,
              h('span', { class: 'ajuda', text: p.jeito === 'testemunho' ? 'quem sabe: ' + nomeS(p.de) : M.ONDE[p.onde] }),
              p.cena ? h('span', { class: 'badge', text: 'marcada na cena' }) : null,
              p.entregue ? h('span', { class: 'badge ok', text: 'entregue às ' + hora(p.entregue) }) : null),
            h('textarea', { class: 'in', rows: 2, 'data-k': 'mp:' + p.id + ':txt', maxlength: 600, value: p.txt, 'aria-label': 'O texto da pista', oninput: ev => mudarC(cid, 'escrever a pista', x => { const y = x.pistas.find(z => z.id === p.id); y.txt = ev.target.value; }, 'mp:' + cid + ':' + p.id) }),
            h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn xs' + (p.entregue ? '' : ' pri'), 'data-k': 'mp:' + p.id + ':entregar', onclick: () => entregar(cid, p.id) }, p.entregue ? 'Recolher' : 'Entregar agora')))))));
      return h('section', { class: 'det', 'aria-label': c.titulo },
        h('div', { class: 'cab' },
          h('input', { class: 'in nome', 'data-k': 'mc:titulo', value: c.titulo, maxlength: 100, 'aria-label': 'O nome do caso', oninput: ev => mudarC(cid, 'renomear o caso', x => { x.titulo = ev.target.value || 'Caso'; }, 'mc:' + cid + ':titulo') }),
          h('span', { class: 'badge ' + BADGE[c.estado][1], text: BADGE[c.estado][0] })),
        h('div', { class: 'row' },
          h('button', { type: 'button', class: 'btn' + (c.aberto ? '' : ' pri'), 'data-k': 'mc:abrir', onclick: () => abrirAMesa(cid) }, c.aberto ? 'Tirar da mesa' : 'Abrir à mesa'),
          h('button', { type: 'button', class: 'btn', 'data-k': 'mc:cena', onclick: () => cenaDoCrime(cid) }, 'Gerar a cena do crime…'),
          h('button', { type: 'button', class: 'btn per', 'data-k': 'mc:apagar', onclick: () => apagar(cid) }, 'Apagar')),
        h('p', { class: 'ajuda', text: M.TIPOS[c.tipo].n + '. Cena do crime sugerida: ' + M.CENAS[c.cena] + '. ' + (c.aberto ? 'A mesa vê o caso nas Pistas: ' + (pub ? pub.pistas.length : 0) + ' pistas entregues, ' + (pub ? pub.suspeitos.length : 0) + ' suspeitos à mostra.' : 'A mesa ainda não vê este caso.') }),
        pendente ? h('div', { class: 'aviso', 'data-k': 'mc:acusacao' },
          h('p', {}, h('b', { text: (acus.por || 'O grupo') + ' acusa ' + nomeS(acus.sid) + '.' }), acus.txt ? ' “' + acus.txt + '”' : ''),
          h('div', { class: 'row' },
            h('button', { type: 'button', class: 'btn pri sm', 'data-k': 'mc:acertou', onclick: () => veredito(cid, true) }, 'Acertaram'),
            h('button', { type: 'button', class: 'btn sm', 'data-k': 'mc:errou', onclick: () => veredito(cid, false) }, 'Não foi ' + nomeS(acus.sid)))) : null,
        vd ? h('p', { class: 'ajuda', 'data-k': 'mc:veredito', text: 'O veredito que a mesa viu: ' + vd.txt }) : null,
        verdade, susp, pistas,
        h('label', { class: 'field' }, h('span', { text: 'Notas do caso' }), h('textarea', { class: 'in', rows: 3, 'data-k': 'mc:notas', maxlength: 4000, value: c.notas, oninput: ev => mudarC(cid, 'escrever as notas do caso', x => { x.notas = ev.target.value; }, 'mc:' + cid + ':notas') })));
    }
    function pintar() {
      if (sel && !caso(sel)) sel = null;
      const lista = pintarLista();
      if (modo === 'gerar') return h('div', { class: 'cols' }, lista, pintarGerador());
      if (sel) return h('div', { class: 'cols' }, lista, pintarCaso(sel));
      return h('div', { class: 'cols' }, lista, h('div', { class: 'vazio' }, h('p', { class: 'tit', text: 'Os mistérios' }),
        h('p', { text: 'Monte um caso para o grupo investigar: o culpado, o motivo e o método; os suspeitos, cada um com álibi e segredo; e três pistas para cada conclusão, para o grupo não travar se perder uma. Depois, a cena do crime nas Cenas, com as pistas escondidas no mapa.' }),
        h('button', { type: 'button', class: 'btn pri', 'data-k': 'mi:novo2', onclick: abrirGerador }, 'Gerar um caso')));
    }
    // (as Cenas marcaram as pistas na cena do crime, ou o mural mudou: só redesenha)
    return { pintar, selecionar, casos, caso, abrirGerador, guardarGerado, abrirAMesa, entregar, mostrarSuspeito, responder, veredito, cenaDoCrime, ger, get sel() { return sel; }, get modo() { return modo; } };
  };
})();
