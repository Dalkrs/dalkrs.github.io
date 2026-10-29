/* Tiny Cats · Escudo do mestre (lote 32): os encontros por bioma.
   À esquerda, os biomas do Mapa-múndi (campo, floresta, montanha…), cada um com a tabela dele; à direita, a tabela
   aberta: a chance de haver encontro a cada sorteio e os resultados, cada um com o peso — inimigos do Bestiário (com os
   dados da quantidade), um encontro guardado, um NPC sorteado na hora, um evento ou uma descoberta, ou "nada". "Sugerir
   do Bestiário" põe os inimigos com as tags do bioma; "Testar" sorteia aqui mesmo, sem mexer em nada.
   No Mapa-múndi, onde o grupo está numa região com a tabela dela preenchida, vale a da região; sem ela, a do bioma.
   Para a página, window.EscudoEncontros(kit). */
(() => {
  'use strict';
  window.EscudoEncontros = function (k) {
    const { U, A, J, toast } = k;
    const EN = window.TC.encontros, N = window.TC.npc;
    const { h } = U;
    let sel = EN.ORDEM.includes(U.guarda.ler('tinycats:escudo:bioma')) ? U.guarda.ler('tinycats:escudo:bioma') : 'floresta';
    const testes = {};                                         // o último teste de cada bioma: { r, res }
    const doc = () => EN.normBiomas(A.dadosDe(EN.DOC));

    /* ---------------- o Bestiário ---------------- */
    function inimigos() {
      const B = k.B, out = [];
      if (!B) return out;
      for (const l of A.D.todas()) {
        if (l.apagado || typeof l.id !== 'string' || !l.id.startsWith(B.PRE) || !l.dados) continue;
        const id = l.id.slice(B.PRE.length);
        if (B.idOk(id)) out.push({ id, e: B.normalizar(l.dados) });
      }
      return out.sort((a, b) => a.e.nome.localeCompare(b.e.nome, 'pt-BR'));
    }
    function encontros() {
      const B = k.B, out = [];
      if (!B) return out;
      for (const l of A.D.todas()) {
        if (l.apagado || typeof l.id !== 'string' || !l.id.startsWith(B.PRE_ENC) || !l.dados) continue;
        const id = l.id.slice(B.PRE_ENC.length);
        if (B.idOk(id)) out.push({ id, nome: String(l.dados.nome || 'Encontro').slice(0, 60), itens: (Array.isArray(l.dados.itens) ? l.dados.itens : []).filter(y => y && B.idOk(y.id) && y.n > 0) });
      }
      return out.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    }

    /* ---------------- mudar ---------------- */
    function mudarT(rotulo, fn, chaveTexto) {
      const faz = () => { const d = doc(); const t = EN.tabelaDe(d, sel); fn(t, d); d.tabelas[sel] = EN.normTabela(t); A.gravar(EN.DOC, EN.normBiomas(d)); };
      if (chaveTexto) { k.mudarTexto(chaveTexto, rotulo, [EN.DOC], faz); return; }
      k.mudar(rotulo, [EN.DOC], faz);
    }
    const mudarItem = (iid, rotulo, fn, chaveTexto) => mudarT(rotulo, t => { const x = t.itens.find(y => y.id === iid); if (x) fn(x, t); }, chaveTexto);
    function novoItem(tipo) {
      const base = { k: tipo, p: tipo === 'nada' ? 3 : 2 };
      if (tipo === 'inimigo') { const l = inimigos(); const c = l.find(x => EN.combina(x.e, sel)) || l[0]; base.ref = c ? c.id : null; base.dados = c ? EN.DADOS_DO_TIER[c.e.ficha.tier] || '1d3' : '1d4'; }
      if (tipo === 'encontro') { const l = encontros(); base.ref = l[0] ? l[0].id : null; }
      let nid = null;
      mudarT('pôr um resultado', t => { const it = EN.normItem(base); nid = it.id; t.itens.push(it); });
      setTimeout(() => { const el = document.querySelector('[data-k="b:i:' + nid + ':' + (tipo === 'evento' ? 'txt' : tipo === 'inimigo' ? 'ref' : 'p') + '"]'); if (el) el.focus(); }, 30);
    }
    function sugerir() {
      const l = inimigos(), t = EN.tabelaDe(doc(), sel), novos = EN.sugerirDoBestiario(t, sel, l);
      const tags = EN.BIOMAS[sel].tags.join(', ');
      if (!k.B || !k.naMesa()) { toast('Numa mesa, os inimigos do Bestiário com as tags do bioma entram aqui.'); return; }
      if (!novos.length) { toast(l.some(x => EN.combina(x.e, sel)) ? 'Os inimigos do Bestiário com as tags deste bioma (' + tags + ') já estão na tabela.' : 'Nenhum inimigo do Bestiário tem as tags deste bioma (' + tags + '). Ponha a tag no inimigo, no Bestiário.', null, null, 7000); return; }
      mudarT('sugerir do Bestiário', x => { for (const it of novos) x.itens.push(it); if (!x.chance) x.chance = 30; });
      k.avisoDesfazer(novos.length === 1 ? 'Um inimigo do Bestiário entrou na tabela.' : novos.length + ' inimigos do Bestiário entraram na tabela (os dados da quantidade vêm do tier: confira).');
    }
    function testar() {
      const t = EN.tabelaDe(doc(), sel);
      const porId = new Map(inimigos().map(x => [x.id, { nome: x.e.nome, e: x.e }])), encs = new Map(encontros().map(x => [x.id, x]));
      const r = EN.sortear(t);
      const res = r.houve ? EN.resolver(r.item, { inimigo: id => porId.get(id) || null, encontro: id => encs.get(id) || null, npc: N, racas: A.dadosDe(N.RACAS) }) : null;
      testes[sel] = { r, res, n: (testes[sel] ? testes[sel].n : 0) + 1 };
      k.pintar();
    }

    /* ---------------- pintar ---------------- */
    function pintarTeste() {
      const x = testes[sel];
      if (!x) return null;
      const { r, res } = x;
      let corpo;
      if (!r.chance) corpo = [h('b', { text: 'Sem chance de encontro' }), h('p', { text: 'A chance deste bioma está em 0%.' })];
      else if (!r.houve) corpo = [h('b', { text: 'Nada acontece' }), h('p', { text: 'O d100 deu ' + r.d100 + '; precisava de ' + r.chance + ' ou menos.' })];
      else {
        corpo = [h('b', { text: 'Encontro!' }), h('p', { class: 'publico', text: res.texto.charAt(0).toUpperCase() + res.texto.slice(1) + (res.nota ? ' — ' + res.nota : '') })];
        if (res.linhas.some(l => l.dados && /d/.test(l.dados))) corpo.push(h('small', { text: 'Quantidade: ' + res.linhas.map(l => l.dados).filter(Boolean).join(' · ') }));
        if (res.npc) { const ds = N.descricao(res.npc); corpo.push(h('small', { text: ds.aparencia + ' ' + ds.jeito })); }
        corpo.push(h('small', { text: 'd100: ' + r.d100 + ' (chance ' + r.chance + '%) · peso ' + r.peso + ' de ' + r.total }));
      }
      return h('div', { class: 'cartao teste' + (r.houve ? ' houve' : ''), role: 'status', 'data-k': 'b:teste:' + x.n }, corpo,
        h('p', { class: 'ajuda', text: 'É só um teste: nada foi para a mesa. No Mapa-múndi, o sorteio de verdade mostra a dificuldade (com os personagens do grupo) e puxa os inimigos para a cena.' }));
    }
    function linhaItem(it, i, t, pct, ini, encs) {
      const B = k.B, kk = 'b:i:' + it.id;
      const campos = [];
      if (it.k === 'inimigo') {
        const tem = ini.some(x => x.id === it.ref);
        campos.push(h('select', { class: 'in', 'data-k': kk + ':ref', 'aria-label': 'O inimigo', onchange: ev => mudarItem(it.id, 'trocar o inimigo', x => { x.ref = ev.target.value || null; }) },
          [!tem ? h('option', { value: '', text: it.ref ? 'O inimigo saiu do Bestiário' : ini.length ? 'Escolha o inimigo…' : 'O Bestiário está vazio', selected: true }) : null]
            .concat(ini.map(x => h('option', { value: x.id, text: x.e.nome + ' (tier ' + x.e.ficha.tier + ')' + (EN.combina(x.e, sel) ? '' : ' · sem a tag'), selected: x.id === it.ref ? true : null })))));
        campos.push(h('input', { class: 'in dados', 'data-k': kk + ':dados', value: it.dados, maxlength: 10, title: 'A quantidade: 3, 1d4, 2d6+1…', 'aria-label': 'Os dados da quantidade',
          onchange: ev => { const v = ev.target.value.trim(); if (!EN.dadosOk(v)) { toast('A quantidade é um número ou dados (ex.: 1d4+1).'); ev.target.value = it.dados; return; } mudarItem(it.id, 'mudar a quantidade', x => { x.dados = v; }); } }));
      } else if (it.k === 'encontro') {
        const tem = encs.some(x => x.id === it.ref);
        campos.push(h('select', { class: 'in', 'data-k': kk + ':ref', 'aria-label': 'O encontro guardado', onchange: ev => mudarItem(it.id, 'trocar o encontro', x => { x.ref = ev.target.value || null; }) },
          [!tem ? h('option', { value: '', text: it.ref ? 'O encontro saiu do Bestiário' : encs.length ? 'Escolha o encontro…' : 'Nenhum encontro guardado no Bestiário', selected: true }) : null]
            .concat(encs.map(x => h('option', { value: x.id, text: x.nome, selected: x.id === it.ref ? true : null })))));
      } else if (it.k === 'npc') {
        const rs = N.normRacas(A.dadosDe(N.RACAS)).lista;
        campos.push(h('select', { class: 'in', 'data-k': kk + ':papel', 'aria-label': 'O papel do NPC', onchange: ev => mudarItem(it.id, 'trocar o papel', x => { x.papel = ev.target.value; }) },
          [['', 'Qualquer papel']].concat(N.ORDEM_PAPEIS.map(p => [p, N.PAPEIS[p].nome[0]])).map(o => h('option', { value: o[0], text: o[1], selected: (it.papel || '') === o[0] ? true : null }))));
        if (rs.length) campos.push(h('select', { class: 'in', 'data-k': kk + ':raca', 'aria-label': 'A raça do NPC', onchange: ev => mudarItem(it.id, 'trocar a raça', x => { x.raca = ev.target.value; }) },
          [['', 'Qualquer raça']].concat(rs.map(r => [r.id, r.nome])).map(o => h('option', { value: o[0], text: o[1], selected: (it.raca || '') === o[0] ? true : null }))));
      }
      const txt = it.k === 'evento'
        ? h('input', { class: 'in larga', 'data-k': kk + ':txt', value: it.txt, maxlength: 400, placeholder: 'O que acontece (ex.: uma ponte caída; rastros frescos de lobo)…', 'aria-label': 'O evento', oninput: ev => mudarItem(it.id, 'escrever o evento', x => { x.txt = ev.target.value; }, kk + ':txt') })
        : it.k !== 'nada' ? h('input', { class: 'in nota', 'data-k': kk + ':txt', value: it.txt, maxlength: 160, placeholder: 'Nota (opcional)', 'aria-label': 'A nota', oninput: ev => mudarItem(it.id, 'escrever a nota', x => { x.txt = ev.target.value; }, kk + ':txt') }) : h('span', { class: 'ajuda', text: 'Nada acontece.' });
      return h('div', { class: 'res k-' + it.k, 'data-k': kk },
        h('label', { class: 'peso', title: 'O peso: quanto maior, mais sai' }, h('span', { text: 'Peso' }),
          h('input', { class: 'in', type: 'number', min: 1, max: 1000, 'data-k': kk + ':p', value: String(it.p), onchange: ev => mudarItem(it.id, 'mudar o peso', x => { x.p = ev.target.value; }) })),
        h('span', { class: 'pct', text: pct.get(it.id) + '%' }),
        h('select', { class: 'in tipo', 'data-k': kk + ':k', 'aria-label': 'O tipo do resultado', onchange: ev => mudarItem(it.id, 'trocar o tipo', x => { const v = ev.target.value; x.k = v; if (v === 'inimigo' && !x.dados) x.dados = '1d4'; }) },
          Object.keys(EN.TIPOS).map(t => h('option', { value: t, text: EN.TIPOS[t], selected: it.k === t ? true : null }))),
        h('div', { class: 'campos' }, campos, txt),
        h('span', { class: 'lado' },
          h('button', { type: 'button', class: 'ib leve', 'data-k': kk + ':sobe', disabled: i === 0, title: 'Subir', onclick: () => mudarT('mover um resultado', x => { const a = x.itens.findIndex(y => y.id === it.id); if (a > 0) { const [y] = x.itens.splice(a, 1); x.itens.splice(a - 1, 0, y); } }) }, '↑'),
          h('button', { type: 'button', class: 'ib leve', 'data-k': kk + ':tirar', title: 'Tirar o resultado', onclick: () => { mudarT('tirar um resultado', x => { x.itens = x.itens.filter(y => y.id !== it.id); }); k.avisoDesfazer('Resultado tirado.'); } }, '×')));
    }
    function pintar() {
      const d = doc(), t = EN.tabelaDe(d, sel), pct = EN.porcentagens(t), ini = inimigos(), encs = encontros();
      const lista = h('nav', { class: 'lista biomas', 'aria-label': 'Os biomas' },
        h('label', { class: 'field' }, h('span', { text: 'Sugerir um sorteio no Mapa-múndi' }),
          h('select', { class: 'in', 'data-k': 'b:sugerir', onchange: ev => { k.mudar('mudar a sugestão', [EN.DOC], () => { const x = doc(); x.sugerir = ev.target.value; A.gravar(EN.DOC, x); }); } },
            Object.keys(EN.SUGERIR).map(s => h('option', { value: s, text: EN.SUGERIR[s], selected: d.sugerir === s ? true : null }))),
          h('small', { class: 'ajuda', text: 'Quando os grupos dos jogadores andam onde há chance de encontro, o Mapa-múndi pergunta se sorteia. Você confirma.' })),
        EN.ORDEM.map(b => {
          const tb = EN.tabelaDe(d, b), vazia = !tb.itens.length || !tb.chance;
          return h('button', { type: 'button', class: 'item', 'data-k': 'bioma:' + b, 'aria-current': String(b === sel), onclick: () => { sel = b; U.guarda.gravar('tinycats:escudo:bioma', b); k.pintar(); } },
            h('span', { class: 'nm' }, h('b', { text: EN.BIOMAS[b].nome }), h('small', { text: tb.itens.length ? tb.chance + '% · ' + tb.itens.length + (tb.itens.length === 1 ? ' resultado' : ' resultados') : 'Vazia' })),
            !vazia ? h('span', { class: 'badge ok', text: tb.chance + '%' }) : null);
        }));
      const det = h('section', { class: 'det', 'aria-label': EN.BIOMAS[sel].nome },
        h('div', { class: 'cab' }, h('h2', { class: 'tit', style: { flex: '1' }, text: EN.BIOMAS[sel].nome }),
          h('button', { type: 'button', class: 'btn sm', 'data-k': 'b:testar', onclick: testar, disabled: !t.itens.length && !t.chance ? true : null }, 'Testar')),
        h('p', { class: 'ajuda', text: 'Vale onde o grupo está, no Mapa-múndi, quando o hexágono é deste bioma e a região de lá não tem a tabela dela (a da região manda). Tags do Bestiário deste bioma: ' + EN.BIOMAS[sel].tags.join(', ') + '.' }),
        h('div', { class: 'row' },
          h('label', { class: 'chance' }, h('span', { text: 'Chance de encontro' }),
            h('input', { class: 'in', type: 'number', min: 0, max: 100, 'data-k': 'b:chance', value: String(t.chance), onchange: ev => mudarT('mudar a chance', x => { x.chance = ev.target.value; }) }), h('span', { text: '% a cada sorteio' }))),
        pintarTeste(),
        t.itens.length ? h('div', { class: 'tabela-res' }, t.itens.map((it, i) => linhaItem(it, i, t, pct, ini, encs)))
          : h('div', { class: 'aviso cinza', text: 'A tabela está vazia. Ponha os resultados: inimigos do Bestiário, um encontro guardado, um NPC, um evento — ou peça ao Bestiário os inimigos com as tags deste bioma.' }),
        t.itens.length < EN.LIM_ITENS ? h('div', { class: 'row' },
          h('span', { class: 'ajuda', text: 'Pôr:' }),
          Object.keys(EN.TIPOS).map(tp => h('button', { type: 'button', class: 'btn xs', 'data-k': 'b:novo:' + tp, onclick: () => novoItem(tp) }, '+ ' + { inimigo: 'Inimigo', encontro: 'Encontro guardado', npc: 'NPC', evento: 'Evento', nada: 'Nada' }[tp])),
          h('span', { class: 'grow' }),
          h('button', { type: 'button', class: 'btn sm', 'data-k': 'b:sugerir-best', onclick: sugerir }, 'Sugerir do Bestiário')) : null,
        !k.naMesa() ? h('p', { class: 'ajuda', text: 'Fora de uma mesa, o Bestiário não está aqui: os inimigos e os encontros guardados aparecem numa mesa.' }) : null);
      return h('div', { class: 'cols' }, lista, det);
    }
    return { pintar, testar, sugerir, novoItem, inimigos, encontros, get sel() { return sel; }, set sel(b) { if (EN.ORDEM.includes(b)) sel = b; } };
  };
})();
