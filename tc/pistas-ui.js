/* Tiny Cats · as pistas na tela (lote 31): o handout como os jogadores o veem (a imagem, a carta com os trechos ainda
   escondidos como manchas) e os sete puzzles, jogáveis. Usado pelas Pistas (os jogadores), pela prévia e pelo teste do
   Escudo do mestre e pela janela que a casca abre quando chega uma pista.
   TC.pistasUI.handout(pista, opts) → elemento.   opts: { grande, aoAmpliar(url) }
   TC.pistasUI.puzzle(jogo, ctx) → elemento (pintar de novo a cada mudança, por cima — data-k em tudo que se mexe).
     ctx: { jogar(op, mudas, prova) → promessa (o lance; quem chama mostra o erro), quem(uid) → nome, chave (prefixo dos
            data-k), mestre, sel (a peça escolhida no quebra-cabeça: ctx.sel / ctx.escolher(i)), resposta (o mestre vê) } */
(() => {
  'use strict';
  const E = window.TC.escudo, U = window.TC.dom;
  const { h, svg } = U;
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);

  /* ---------------- o handout ---------------- */
  function textoComManchas(partes) {
    const out = [];
    partes.forEach((p, i) => {
      if (typeof p === 'number') out.push(h('span', { class: 'mancha', style: { width: Math.min(28, Math.max(1.6, p * 0.52)) + 'em' }, title: 'Trecho escondido', 'aria-label': 'trecho escondido' }));
      else {
        const linhas = String(p).split('\n');
        linhas.forEach((l, k) => { if (k) out.push(h('br')); if (l) out.push(l); });
      }
    });
    return out;
  }
  function handout(p, opts) {
    opts = opts || {};
    p = E.normPista(p);
    const kids = [];
    if (p.img) {
      kids.push(h('figure', { class: 'ho-fig' },
        h('img', { src: p.img, alt: p.legenda || p.nome, loading: 'lazy', onclick: opts.aoAmpliar ? () => opts.aoAmpliar(p.img) : null, class: opts.aoAmpliar ? 'ampliavel' : null }),
        p.legenda && p.tipo === 'imagem' ? h('figcaption', { text: p.legenda }) : null));
    }
    const temTexto = p.partes.some(x => typeof x === 'number' || String(x).trim());
    if (p.tipo !== 'imagem' && (temTexto || p.assinatura)) {
      kids.push(h('div', { class: 'ho-txt' }, textoComManchas(p.partes)));
      if (p.assinatura) kids.push(h('div', { class: 'ho-ass', text: p.assinatura }));
    } else if (p.tipo === 'imagem' && temTexto) kids.push(h('div', { class: 'ho-nota' }, textoComManchas(p.partes)));
    const papel = p.tipo === 'imagem' ? 'imagem' : p.papel;
    return h('article', { class: 'ho ho-' + papel + (opts.grande ? ' grande' : ''), 'data-k': 'ho:' + (p.hid || 'x') },
      h('h3', { class: 'ho-tit', text: p.nome }), kids);
  }

  /* ---------------- os puzzles ---------------- */
  const SIMB = k => { const s = E.SIMBOLOS[k]; return svg(28, s ? s[2] : '', '1.8'); };
  const nomeSimb = k => (E.SIMBOLOS[k] || ['?'])[0];
  function cabecalho(jg, ctx) {
    const q = uid => (ctx.quem ? ctx.quem(uid) : '') || 'alguém';
    const linhas = [];
    if (jg.resolvido) linhas.push(h('div', { class: 'pz-ok', 'data-k': ctx.chave + 'ok' }, svg(16, '<path d="M4 12.5l5 5L20 6.5"/>', '2.4'), ' Resolvido por ' + q(jg.resolvido.por) + ' às ' + U.hora(jg.resolvido.em) + '.'));
    else if (jg.ultimo && jg.ultimo.txt) linhas.push(h('div', { class: 'pz-ult', 'data-k': ctx.chave + 'ult' }, q(jg.ultimo.por) + ' ' + jg.ultimo.txt + ' · ' + U.hora(jg.ultimo.em)));
    if (E.PUZZLES[jg.tipo].erra && jg.erros) linhas.push(h('div', { class: 'pz-erros', text: jg.erros === 1 ? 'Uma tentativa errada.' : jg.erros + ' tentativas erradas.' }));
    // (lote 46) o cronômetro: a conta anda sozinha (relogioPz, abaixo); acabado, o puzzle trava até o mestre decidir
    const pr = E.prazo && E.prazo(jg);
    if (pr && !jg.resolvido) linhas.push(h('div', { class: 'pz-tempo' + (pr.acabou ? ' acabou' : ''), 'data-pz-fim': String(pr.acabou ? 0 : pr.fim), 'data-k': ctx.chave + 'tempo', text: textoTempo(pr.acabou ? 0 : pr.resta) }));
    return h('div', { class: 'pz-cab' },
      h('div', { class: 'pz-tipo' }, h('b', { text: E.PUZZLES[jg.tipo].nome }), h('span', { class: 'pz-dif', text: E.DIF[jg.dif] })),
      h('p', { class: 'pz-desc', text: E.PUZZLES[jg.tipo].desc }), linhas);
  }
  const textoTempo = ms => (ms <= 0 ? 'O tempo acabou. O mestre decide se dá mais tempo.' : 'Falta ' + Math.floor(ms / 60000) + ':' + String(Math.floor((ms % 60000) / 1000)).padStart(2, '0'));
  // (um relógio só, para todos os puzzles da página: a conta de cada cronômetro, e o puzzle trava quando acaba)
  let relogioPz = 0;
  function cuidarDoRelogio() {
    if (relogioPz || typeof document === 'undefined') return;
    relogioPz = setInterval(() => {
      for (const el of document.querySelectorAll('[data-pz-fim]')) {
        const fim = Number(el.getAttribute('data-pz-fim')), resta = fim ? fim - Date.now() : 0;
        el.textContent = textoTempo(resta);
        if (resta <= 0) { el.classList.add('acabou'); const pz = el.closest('.pz'); if (pz) pz.classList.add('esgotado'); }
      }
    }, 1000);
  }
  function erroDe(ctx, p) { return Promise.resolve(p).catch(e => { if (ctx.aviso) ctx.aviso((e && e.message) || 'Não deu certo agora.'); }); }
  // um lance; se o estado novo resolve, já vai como "acertar" (o banco confere)
  function lance(jg, ctx, mudas, txt) {
    const novo = Object.assign({}, jg, { estado: Object.assign({}, jg.estado, mudas) });
    for (const k of Object.keys(mudas)) if (mudas[k] === null) delete novo.estado[k];
    const prova = E.provaDoEstado(novo);
    const m = Object.assign({}, mudas, { _txt: txt });
    if (prova != null && E.confere(novo, prova)) return erroDe(ctx, ctx.jogar('acertar', m, prova));
    return erroDe(ctx, ctx.jogar('jogar', m));
  }
  function tentativa(jg, ctx, prova, mudasErro, txtErro, mudasCerto, txtCerto) {
    if (E.confere(jg, prova)) return erroDe(ctx, ctx.jogar('acertar', Object.assign({}, mudasCerto || {}, { _txt: txtCerto || 'acertou' }), prova));
    return erroDe(ctx, ctx.jogar('errar', Object.assign({}, mudasErro || {}, { _txt: txtErro })));
  }
  const fechado = (jg, ctx) => !!jg.resolvido || ctx.soVer || !!(E.prazo && (E.prazo(jg) || {}).acabou);

  function cifra(jg, ctx) {
    const p = jg.pub, e = jg.estado, f = fechado(jg, ctx);
    const letraDe = i => p.dadas[i] || e['d' + i] || e['c' + i] || '';
    const dada = i => !!(p.dadas[i] || e['d' + i]);
    const runas = p.metodo === 'runas';
    // a mensagem: cada símbolo com a letra de agora embaixo
    const palavras = [];
    let pal = [];
    const fecha = () => { if (pal.length) palavras.push(h('span', { class: 'cf-pal' }, pal)); pal = []; };
    for (const x of p.cod) {
      if (typeof x === 'number') pal.push(h('span', { class: 'cf-l' + (dada(x) ? ' dada' : '') }, h('span', { class: 'cf-s' + (runas ? ' runa' : ''), text: p.simbolos[x] }), h('span', { class: 'cf-c', text: letraDe(x) || '·' })));
      else { for (const ch of x) { if (ch === ' ') fecha(); else pal.push(h('span', { class: 'cf-p', text: ch })); } }
    }
    fecha();
    // a chave: um campo por símbolo
    const chave = p.simbolos.map((s, i) => h('label', { class: 'cf-k' + (dada(i) ? ' dada' : '') },
      h('span', { class: 'cf-s' + (runas ? ' runa' : ''), text: s }),
      h('input', { class: 'cf-in', 'data-k': ctx.chave + 'c' + i, maxlength: 1, value: letraDe(i), disabled: f || dada(i), 'aria-label': 'A letra do símbolo ' + s, autocomplete: 'off', spellcheck: 'false',
        oninput: ev => {
          const v = String(ev.target.value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, '').slice(-1);
          ev.target.value = v;
          lance(jg, ctx, { ['c' + i]: v || null }, v ? 'pôs ' + v + ' no ' + s : 'apagou a letra do ' + s);
          if (v) { const prox = ev.target.closest('.cf-chave').querySelectorAll('input:not(:disabled)'); const l = [...prox]; const k = l.indexOf(ev.target); if (k >= 0 && l[k + 1]) l[k + 1].focus(); }
        } })));
    return [
      h('div', { class: 'cf-msg' + (runas ? ' runas' : '') }, palavras),
      p.dica ? h('p', { class: 'pz-dica', text: 'Dica: ' + p.dica }) : null,
      h('div', { class: 'cf-chave' }, chave),
    ];
  }

  function charada(jg, ctx) {
    const p = jg.pub, e = jg.estado, f = fechado(jg, ctx);
    const dicas = Array.isArray(e.dicas) ? e.dicas : [];
    const tent = Array.isArray(e.tent) ? e.tent.slice(-6) : [];
    const id = ctx.chave + 'resp';
    const responder = () => {
      const el = document.querySelector('[data-k="' + id + '"]');
      const v = el ? el.value.trim() : '';
      if (!v) return;
      const prova = E.provaDoEstado(jg, v);
      if (el) el.value = '';
      tentativa(jg, ctx, prova, { tent: tent.concat({ txt: v.slice(0, 60), por: ctx.eu || null }).slice(-6) }, 'respondeu “' + v.slice(0, 40) + '”', null, 'respondeu certo');
    };
    return [
      h('blockquote', { class: 'ch-p', text: p.pergunta }),
      dicas.length ? h('ul', { class: 'ch-dicas' }, dicas.map(d => h('li', { text: d }))) : null,
      f ? null : h('form', { class: 'ch-form', onsubmit: ev => { ev.preventDefault(); responder(); } },
        h('input', { class: 'in', 'data-k': id, placeholder: 'A resposta…', 'aria-label': 'A resposta', autocomplete: 'off', maxlength: 60 }),
        h('button', { type: 'submit', class: 'btn pri', 'data-k': ctx.chave + 'responder' }, 'Responder')),
      tent.length && !jg.resolvido ? h('div', { class: 'ch-tent' }, 'Já tentaram: ', tent.map((t, i) => h('span', { class: 'ch-t' }, (i ? ', ' : '') + '“' + t.txt + '”'))) : null,
    ];
  }

  function luzes(jg, ctx) {
    const n = jg.pub.n, l = typeof jg.estado.l === 'string' ? jg.estado.l : '0'.repeat(n * n), f = fechado(jg, ctx);
    const RUNA = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛊ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ', 'ᛜ', 'ᛞ', 'ᛟ', 'ᚩ'];
    return [h('div', { class: 'lz', style: { gridTemplateColumns: 'repeat(' + n + ', 1fr)' } },
      [...l].map((c, i) => h('button', { type: 'button', class: 'lz-r' + (c === '1' ? ' acesa' : ''), 'data-k': ctx.chave + 'l' + i, disabled: f, 'aria-pressed': String(c === '1'), 'aria-label': 'Runa ' + (i + 1) + (c === '1' ? ', acesa' : ', apagada'),
        onclick: () => lance(jg, ctx, { l: E.tocarLuz(l, n, i) }, 'tocou uma runa') }, h('span', { class: 'runa', text: RUNA[i % RUNA.length] })))),
      h('p', { class: 'pz-conta', text: [...l].filter(c => c === '1').length + ' de ' + n * n + ' acesas' })];
  }

  function alavancas(jg, ctx) {
    const p = jg.pub, e = jg.estado, f = fechado(jg, ctx), g = E.gradesDe(p, e);
    return [
      h('div', { class: 'al-grades' }, [...g].map((c, i) => h('div', { class: 'al-g' + (c === '1' ? ' aberta' : ''), title: 'Grade ' + (i + 1) + (c === '1' ? ': aberta' : ': fechada') },
        svg(30, c === '1' ? '<path d="M4 21V5h16v3M4 9h3M4 13h3M4 17h3"/>' : '<path d="M4 21V3h16v18M8 3v18M12 3v18M16 3v18M4 9h16"/>', '1.8'), h('small', { text: String(i + 1) })))),
      h('div', { class: 'al-al' }, p.liga.map((_, i) => {
        const up = e['a' + i] === '1';
        return h('button', { type: 'button', class: 'al-a' + (up ? ' cima' : ''), 'data-k': ctx.chave + 'a' + i, disabled: f, 'aria-pressed': String(up), 'aria-label': 'Alavanca ' + (i + 1) + (up ? ', para cima' : ', para baixo'),
          onclick: () => lance(jg, ctx, { ['a' + i]: up ? '0' : '1' }, (up ? 'baixou' : 'subiu') + ' a alavanca ' + (i + 1)) },
          svg(34, up ? '<path d="M12 21v-4M8 21h8M12 17 17 5"/><circle cx="17.5" cy="4.5" r="2.2"/>' : '<path d="M12 21v-4M8 21h8M12 17 7 5"/><circle cx="6.5" cy="4.5" r="2.2"/>', '1.8'), h('small', { text: String(i + 1) }));
      })),
      h('p', { class: 'pz-conta', text: [...g].filter(c => c === '1').length + ' de ' + g.length + ' grades abertas' }),
    ];
  }

  function cadeado(jg, ctx) {
    const p = jg.pub, e = jg.estado, f = fechado(jg, ctx), k = p.simbolos.length;
    const pos = [...Array(p.n)].map((_, i) => { const v = Number(e['d' + i]); return Number.isInteger(v) && v >= 0 && v < k ? v : 0; });
    const girar = (i, d) => lance(jg, ctx, { ['d' + i]: (pos[i] + d + k) % k }, 'girou o disco ' + (i + 1));
    const tent = Array.isArray(e.tent) ? e.tent.slice(-4) : [];
    return [
      h('div', { class: 'cd-pistas' }, h('div', { class: 'cd-rot', text: 'Riscado na parede:' }), p.pistas.map((c, i) => h('div', { class: 'cd-p' },
        h('span', { class: 'cd-c' }, c.c.map(x => h('span', { class: 'cd-s', title: nomeSimb(p.simbolos[x]) }, SIMB(p.simbolos[x])))), h('span', { class: 'cd-t', text: E.textoPistaCadeado(c, p.n) })))),
      h('div', { class: 'cd-discos' }, pos.map((v, i) => h('div', { class: 'cd-d' },
        h('button', { type: 'button', class: 'ib leve', 'data-k': ctx.chave + 'd' + i + '+', disabled: f, 'aria-label': 'Girar o disco ' + (i + 1) + ' para cima', onclick: () => girar(i, -1) }, '▲'),
        h('div', { class: 'cd-v', title: nomeSimb(p.simbolos[v]) }, SIMB(p.simbolos[v])),
        h('button', { type: 'button', class: 'ib leve', 'data-k': ctx.chave + 'd' + i + '-', disabled: f, 'aria-label': 'Girar o disco ' + (i + 1) + ' para baixo', onclick: () => girar(i, 1) }, '▼')))),
      f ? null : h('div', { class: 'row', style: { justifyContent: 'center' } }, h('button', { type: 'button', class: 'btn pri', 'data-k': ctx.chave + 'abrir',
        onclick: () => tentativa(jg, ctx, pos.join(','), { tent: tent.concat({ c: pos }).slice(-4) }, 'tentou abrir o cadeado', null, 'abriu o cadeado') }, 'Tentar abrir')),
      tent.length && !jg.resolvido ? h('div', { class: 'cd-tent' }, h('span', { text: 'Não abriu com: ' }), tent.map(t => h('span', { class: 'cd-c' }, (Array.isArray(t.c) ? t.c : []).map(x => h('span', { class: 'cd-s mini' }, SIMB(p.simbolos[x] || '')))))) : null,
    ];
  }

  function placas(jg, ctx) {
    const p = jg.pub, e = jg.estado, f = fechado(jg, ctx);
    const seq = Array.isArray(e.seq) ? e.seq.filter(x => Number.isInteger(x) && x >= 0 && x < p.n) : [];
    const pisar = i => {
      if (seq.includes(i)) return;
      const nova = seq.concat(i);
      if (nova.length < p.n) { lance(jg, ctx, { seq: nova }, 'pisou na placa ' + E.SIMBOLOS[p.simbolos[i]][1]); return; }
      tentativa(jg, ctx, nova.join(','), { seq: [] }, 'pisou na ordem errada: as placas voltaram', { seq: nova }, 'pisou na ordem certa');
    };
    return [
      h('div', { class: 'pl-pistas' }, h('div', { class: 'cd-rot', text: 'As inscrições:' }), h('ul', null, p.pistas.map(c => h('li', { text: E.textoPistaPlacas(c, p.simbolos) })))),
      h('div', { class: 'pl-placas' }, p.simbolos.map((s, i) => {
        const k = seq.indexOf(i);
        return h('button', { type: 'button', class: 'pl-p' + (k >= 0 ? ' pisada' : ''), 'data-k': ctx.chave + 'p' + i, disabled: f || k >= 0, 'aria-label': 'Placa ' + E.SIMBOLOS[s][1] + (k >= 0 ? ', pisada em ' + (k + 1) + 'º' : ''), onclick: () => pisar(i) },
          SIMB(s), h('small', { text: k >= 0 ? (k + 1) + 'º' : nomeSimb(s) }));
      })),
      f || !seq.length ? null : h('div', { class: 'row', style: { justifyContent: 'center' } }, h('button', { type: 'button', class: 'btn sm', 'data-k': ctx.chave + 'recomecar', onclick: () => lance(jg, ctx, { seq: [] }, 'saiu das placas') }, 'Sair das placas e recomeçar')),
    ];
  }

  function imagem(jg, ctx) {
    const p = jg.pub, n = p.n, f = fechado(jg, ctx);
    const pos = Array.isArray(jg.estado.p) && jg.estado.p.length === n * n ? jg.estado.p : [...Array(n * n).keys()];
    const sel = Number.isInteger(ctx.sel) ? ctx.sel : null;
    if (!p.img) return [h('p', { class: 'ajuda', text: 'Este quebra-cabeça ficou sem imagem.' })];
    return [h('div', { class: 'qc', style: { gridTemplateColumns: 'repeat(' + n + ', 1fr)', aspectRatio: String(p.ar || 1), width: 'min(100%, ' + Math.round(520 * Math.min(1, p.ar || 1)) + 'px)' } }, pos.map((pc, i) => {
      const x = n > 1 ? (pc % n) * 100 / (n - 1) : 0, y = n > 1 ? Math.floor(pc / n) * 100 / (n - 1) : 0;
      return h('button', { type: 'button', class: 'qc-p' + (sel === i ? ' sel' : '') + (pc === i ? ' certa' : ''), 'data-k': ctx.chave + 'q' + i, disabled: f, 'aria-label': 'Peça na casa ' + (i + 1) + (sel === i ? ', escolhida' : ''),
        style: { backgroundImage: 'url("' + p.img.replace(/"/g, '%22') + '")', backgroundSize: n * 100 + '% ' + n * 100 + '%', backgroundPosition: x + '% ' + y + '%' },
        onclick: () => {
          if (sel == null) { if (ctx.escolher) ctx.escolher(i); return; }
          if (ctx.escolher) ctx.escolher(null);
          if (sel === i) return;
          const novo = pos.slice(); [novo[sel], novo[i]] = [novo[i], novo[sel]];
          lance(jg, ctx, { p: novo }, 'trocou duas peças');
        } });
    })), h('p', { class: 'pz-conta', text: sel == null ? 'Escolha uma peça, depois a casa para onde ela vai.' : 'Agora escolha a peça para trocar de lugar com ela.' })];
  }

  const CORPO = { cifra, charada, luzes, alavancas, cadeado, placas, imagem };
  // (lote 46) os puzzles de tc/pistas-puzzles.js se registram aqui
  const registrarCorpo = (tipo, fn) => { CORPO[tipo] = fn; };
  function puzzle(jg, ctx) {
    jg = E.normJogo(jg);
    ctx = Object.assign({ chave: 'pz:' }, ctx || {});
    if (!jg) return h('div', { class: 'pz' }, h('p', { class: 'ajuda', text: 'Este puzzle não abriu.' }));
    let corpo;
    if (E.prazo && E.prazo(jg)) cuidarDoRelogio();
    try { corpo = CORPO[jg.tipo](jg, ctx); } catch (e) { console.error(e); corpo = [h('p', { class: 'ajuda', text: 'Este puzzle não abriu.' })]; }
    const esgotado = !jg.resolvido && !!(E.prazo && (E.prazo(jg) || {}).acabou);
    return h('div', { class: 'pz pz-' + jg.tipo + (jg.resolvido ? ' resolvido' : '') + (esgotado ? ' esgotado' : ''), 'data-k': ctx.chave + 'raiz' },
      cabecalho(jg, ctx), h('div', { class: 'pz-corpo' }, corpo),
      ctx.resposta ? h('div', { class: 'pz-resp', 'data-k': ctx.chave + 'resposta' }, h('b', { text: 'Resposta (só você vê): ' }), ctx.resposta) : null);
  }
  // a resposta de um puzzle, em palavras (para o mestre)
  function respostaEmPalavras(h_) {
    const m = E.montarPuzzle(h_.puzzle, h_.img);
    if (!m) return '';
    const p = m.pub;
    switch (m.tipo) {
      case 'cifra': return m.resposta;
      case 'charada': return (h_.puzzle.propria ? h_.puzzle.propria.r : E.CHARADAS[h_.puzzle.idx || 0].r).join(' / ');
      case 'cadeado': return m.resposta.split(',').map(i => nomeSimb(p.simbolos[+i])).join(' · ');
      case 'placas': return m.resposta.split(',').map(i => nomeSimb(p.simbolos[+i])).join(' → ');
      case 'luzes': return 'acender todas as runas';
      case 'alavancas': return 'abrir todas as grades';
      case 'imagem': return 'cada peça no seu lugar';
      default: { const x = E.EXTRA && E.EXTRA[m.tipo]; return x && x.resposta ? x.resposta(m, h_.puzzle) : ''; }
    }
    return '';
  }

  window.TC.pistasUI = { handout, puzzle, respostaEmPalavras, textoComManchas, ehObj, registrarCorpo, kit: { lance, tentativa, erroDe, fechado, SIMB, nomeSimb } };
})();
