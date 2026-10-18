/* Tiny Cats · Mapa-múndi · os reinos no painel (lote 10).
   A seção Província (ou Sub-região) da região escolhida: de qual província ela é parte, as sub-regiões de dentro (com o
   dono de cada uma, quando é outro) e os hexágonos por terreno. Na aba Reinos, o Livro do reino: por facção, as
   províncias, as sub-regiões, os hexágonos e os exércitos.
   Usa as ferramentas do painel (MundoPainel.kit): nada aqui muda o mapa direto. */
(() => {
  'use strict';
  const kit = () => window.MundoPainel.kit;
  const R = () => window.MundoReino;
  const N = () => window.MundoNucleo;
  const Cam = () => window.MundoCamadas || null;

  /* ---------------- a seção Província (ou Sub-região) ---------------- */
  function secProvincia(o, m) {
    const { h, nota, secao, plural, nomeDe, nomeFac, facDe, irPara } = kit();
    if (!R() || !o || o.k !== 'r') return null;
    const ehProv = !o.pai, prov = R().provinciaDe(m, o), out = [];
    const dono = r => N().facDaRegiao(m, r);
    if (!ehProv && prov && prov !== o) {
      out.push(h('div', { class: 'row prov-de' }, h('span', { class: 'note', text: 'Parte da província' }),
        h('button', { type: 'button', class: 'btn sm lnk', 'data-k': 'o:' + o.id + ':prov', title: 'Ir para a província', text: nomeDe(prov, m), onclick: () => irPara(prov.id) })));
    }
    // as sub-regiões de dentro (em árvore), com o dono quando é outro que o desta
    const subs = R().subregioesDe(m, o), meu = dono(o), Cm = Cam(), escondida = !!(Cm && !Cm.visivel('subregioes'));
    if (subs.length) {
      out.push(h('div', { class: 'prov-subs', 'data-k': 'o:' + o.id + ':subs' },
        h('small', { class: 'note', text: (ehProv ? 'Sub-regiões' : 'Dentro dela') + ' (' + subs.length + ')' + (escondida ? ' · a camada Sub-regiões está escondida neste aparelho' : '') }),
        subs.map(({ r, nivel }) => {
          const f = dono(r), outro = f !== meu;
          return h('button', { type: 'button', class: 'li clic prov-sub' + (escondida ? ' fora-cam' : ''), 'data-k': 'sub:' + r.id, style: { 'padding-left': (8 + 14 * (nivel - 1)) + 'px' },
            title: 'Ir para ' + nomeDe(r, m), onclick: () => irPara(r.id) },
            h('span', { class: 'tx' }, h('b', { text: nomeDe(r, m) }), outro ? h('small', { text: f ? 'de ' + nomeFac(facDe(m, f)) : 'sem dono' }) : null));
        })));
    } else if (ehProv) {
      out.push(nota('Nenhuma sub-região. Para um ducado ou uma prefeitura, desenhe uma região aqui dentro e escolha "Dentro de: ' + nomeDe(o, m) + '".'));
    }
    // o terreno: os hexágonos com o centro aqui dentro, por terreno
    if (!N().temGrade(m)) out.push(nota('Sem a grade de hexágonos (aba Mapa), não dá para contar o terreno.'));
    else {
      const t = R().terrenosDaRegiao(m, o);
      out.push(h('div', { class: 'prov-ter', 'data-k': 'o:' + o.id + ':ter' },
        h('b', { text: t.n ? plural(t.n, 'hexágono', 'hexágonos') : 'Nenhum hexágono com o centro aqui dentro' }),
        t.n ? h('ul', null, t.por.map(x => h('li', { 'data-ter': x.id }, h('i', { style: { background: x.cor } }), h('span', { text: x.nome + ' ' + x.n }))),
          t.sem ? h('li', { 'data-ter': '-' }, h('i', { class: 'sem' }), h('span', { text: 'sem terreno ' + t.sem })) : null) : null));
    }
    return secao(ehProv ? 'Província' : 'Sub-região', out);
  }

  /* ---------------- o Livro do reino (na aba Reinos) ---------------- */
  function secLivro(v) {
    const { h, nota, secao, fmt, plural, nomeFac, facDe } = kit();
    if (!R() || !v) return null;
    const L = R().livroDoReino(v), out = [];
    const linha = (l, nome, cor) => h('div', { class: 'livro-li', 'data-k': 'livro:' + (l.fac || '-') },
      h('i', { class: cor ? '' : 'sem', style: cor ? { background: cor } : null }), h('b', { text: nome }),
      h('small', { text: [plural(l.prov, 'província', 'províncias'), plural(l.sub, 'sub-região', 'sub-regiões'), L.grade ? plural(l.hex, 'hexágono', 'hexágonos') : null,
        l.exe ? plural(l.exe, 'exército', 'exércitos') + ' (' + fmt(l.tropas, 0) + ' tropas)' : null].filter(Boolean).join(' · ') }));
    for (const l of L.linhas) { const f = facDe(v, l.fac); if (f) out.push(linha(l, nomeFac(f), f.cor)); }
    const s = L.sem;
    if (s.prov || s.sub || s.hex || s.exe) out.push(linha(s, 'Sem dono', null));
    if (!out.length) out.push(nota('Nada ainda.'));
    if (!L.grade) out.push(nota('Sem a grade de hexágonos (aba Mapa), o livro não conta os hexágonos.'));
    return secao('Livro do reino', out);
  }

  window.MundoReinoPainel = { secProvincia, secLivro };
})();
