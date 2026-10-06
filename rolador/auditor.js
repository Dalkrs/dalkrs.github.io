/* O auditor dos dados da mesa, para o mestre: o que saiu de cada dado, em gráfico, e um veredito em palavras.
   As contas estão em tc/auditoria.js (com testes); aqui é só a janela. Abre pelo Menu do Rolador, dentro de uma mesa.
   Lê o registro da mesa ao vivo inteiro — o que foi rolado pelo chat, pelas fichas, pelos tokens e pelo Rolador,
   inclusive o que já foi limpo do painel — e não muda nada: é só leitura. */
(function () {
  'use strict';
  const A = () => window.TC && window.TC.auditoria;
  const $ = (id) => document.getElementById(id);
  const SVG = 'http://www.w3.org/2000/svg';
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : String(v));
    }
    for (const c of kids.flat(Infinity)) if (c != null && c !== false && c !== '') el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return el;
  }
  function s(tag, attrs, ...kids) {
    const el = document.createElementNS(SVG, tag);
    for (const k in attrs || {}) if (attrs[k] != null) el.setAttribute(k, String(attrs[k]));
    for (const c of kids.flat(Infinity)) if (c != null) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return el;
  }
  const num = (x) => String(Math.round(x * 10) / 10).replace('.', ',');
  const mil = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const plural = (n, um, varios) => mil(n) + ' ' + (n === 1 ? um : varios);
  const ORIGENS = { mesa: 'chat da mesa', rolador: 'Rolador', ficha: 'Fichas', cena: 'Cenas', mundo: 'Mapa-múndi', arvore: 'Árvore', acampamento: 'Acampamento' };
  const NIVEIS = { nada: 'sem rolagens', pouco: 'poucas rolagens', ok: 'dentro do esperado', atencao: 'um pouco fora do comum', fora: 'fora do esperado' };
  const quando = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };

  let mesa = null;                           // o que A.juntar devolveu
  let filtro = { pessoa: '', lados: 0 };     // '' = todas as pessoas; 0 = todos os dados, em faixas
  let pedido = 0;

  /* ---- o gráfico: uma barra por face (ou por faixa); o traço é o esperado; a faixa clara, onde costuma ficar ---- */
  function grafico(c) {
    const a = c.analise, n = a.barras.length;
    const W = 860, H = 270, L = 44, R = 12, T = 16, B = 44, w = (W - L - R) / n, alt = H - T - B;
    const topo = Math.max(1, ...a.barras.map((b) => Math.max(b.obs, b.ate)));
    const passo = topo <= 5 ? 1 : topo <= 12 ? 2 : topo <= 30 ? 5 : topo <= 60 ? 10 : topo <= 150 ? 25 : topo <= 300 ? 50 : topo <= 700 ? 100 : Math.pow(10, Math.floor(Math.log10(topo))) / 2;
    const teto = Math.ceil(topo * 1.06 / passo) * passo, y = (v) => T + alt - (v / teto) * alt;
    const svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'aud-svg', role: 'img',
      'aria-label': 'Gráfico: quantas vezes saiu cada ' + (c.modo === 'faces' ? 'face' : 'faixa') + ', contra o esperado. Os números estão na tabela logo abaixo.' });
    for (let v = 0; v <= teto + 1e-9; v += passo) {
      svg.append(s('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'aud-grade' }), s('text', { x: L - 7, y: y(v) + 4, class: 'aud-eixo', 'text-anchor': 'end' }, mil(Math.round(v))));
    }
    const pulo = n > 24 ? 2 : 1;             // rótulos demais: mostra um sim, um não (os números todos estão na tabela)
    a.barras.forEach((b, i) => {
      const x = L + i * w, fora = Math.abs(b.z) >= 2 && a.minEsp >= 5;
      const g = s('g', null, s('title', null, c.rotulos[i] + ': saiu ' + mil(b.obs) + (b.obs === 1 ? ' vez' : ' vezes') + ' · esperado perto de ' + num(b.esp) + (b.esp > 0 ? ' (costuma ficar entre ' + num(b.de) + ' e ' + num(b.ate) + ')' : '')));
      if (b.esp > 0) g.append(s('rect', { x: x + 1, y: y(b.ate), width: Math.max(1, w - 2), height: Math.max(1, y(b.de) - y(b.ate)), class: 'aud-faixa' }));
      g.append(s('rect', { x: x + w * 0.2, y: y(b.obs), width: w * 0.6, height: Math.max(0, y(0) - y(b.obs)), rx: 2, class: 'aud-barra' + (fora ? ' fora' : '') }));
      if (b.esp > 0) g.append(s('line', { x1: x + 2, x2: x + w - 2, y1: y(b.esp), y2: y(b.esp), class: 'aud-esp' }));
      if (fora) g.append(s('text', { x: x + w / 2, y: Math.max(11, y(Math.max(b.obs, b.ate)) - 4), class: 'aud-marca', 'text-anchor': 'middle' }, b.z > 0 ? '▲' : '▼'));
      if (i % pulo === 0 || n <= 12) g.append(s('text', { x: x + w / 2, y: H - B + 16, class: 'aud-eixo', 'text-anchor': 'middle' }, c.rotulos[i]));
      svg.append(g);
    });
    svg.append(s('line', { x1: L, x2: W - R, y1: y(0), y2: y(0), class: 'aud-base' }));
    svg.append(s('text', { x: (L + W - R) / 2, y: H - 6, class: 'aud-eixo leg', 'text-anchor': 'middle' },
      c.modo === 'faces' ? 'face do d' + c.lados : c.lados ? 'faces do d' + c.lados + ', em dez faixas' : 'em que altura do dado caiu o resultado (0% = a face mais baixa, 100% = a mais alta)'));
    return svg;
  }
  function tabela(c) {
    return h('details', { class: 'aud-nums' }, h('summary', { text: 'Ver os números' }),
      h('table', { class: 'aud-tab' }, h('thead', null, h('tr', null, h('th', { text: c.modo === 'faces' ? 'Face' : 'Faixa' }), h('th', { text: 'Saiu' }), h('th', { text: 'Esperado' }), h('th', { text: 'Costuma ficar entre' }))),
        h('tbody', null, c.analise.barras.map((b, i) => h('tr', { class: Math.abs(b.z) >= 2 && c.analise.minEsp >= 5 ? 'fora' : null },
          h('td', { text: c.rotulos[i] }), h('td', { text: mil(b.obs) }), h('td', { text: b.esp > 0 ? num(b.esp) : '—' }), h('td', { text: b.esp > 0 ? num(b.de) + ' e ' + num(b.ate) : '—' }))))));
  }

  function pintarEspera(texto) {
    $('audBody').replaceChildren(h('p', { class: 'note', id: 'audEspera', text: texto || 'Lendo as rolagens da mesa…' }));
  }
  function pintar() {
    const lib = A(), corpo = $('audBody');
    if (!lib || !mesa) { pintarEspera(); return; }
    if (filtro.pessoa && !mesa.pessoas.some((p) => p.id === filtro.pessoa)) filtro.pessoa = '';
    if (filtro.lados && !mesa.tamanhos.some((t) => t.lados === filtro.lados)) filtro.lados = 0;
    const nDados = mesa.rolagens.reduce((a, r) => a + r.dados.length, 0);
    const selPessoa = h('select', { class: 'input aud-sel', id: 'audPessoa', 'aria-label': 'Pessoa', onchange: (e) => { filtro.pessoa = e.target.value; pintar(); $('audPessoa').focus(); } },
      h('option', { value: '', text: 'Todos (' + plural(nDados, 'dado', 'dados') + ')' }),
      mesa.pessoas.map((p) => h('option', { value: p.id, text: p.nome + ' (' + mil(p.n) + ')' })));
    selPessoa.value = filtro.pessoa;
    const selDado = h('select', { class: 'input aud-sel', id: 'audDado', 'aria-label': 'Dado', onchange: (e) => { filtro.lados = Number(e.target.value) || 0; pintar(); $('audDado').focus(); } },
      h('option', { value: '0', text: 'Todos os dados juntos, em faixas' }),
      mesa.tamanhos.map((t) => h('option', { value: String(t.lados), text: 'd' + t.lados + ' (' + mil(t.n) + ')' })));
    selDado.value = String(filtro.lados);

    const dados = lib.recortar(mesa.rolagens, { pessoa: filtro.pessoa }), c = lib.conferir(dados, filtro.lados || null), v = c.veredito;
    const kids = [];
    kids.push(h('p', { class: 'note', id: 'audIntro' },
      'Tudo o que foi rolado nesta mesa — pelo chat, pelas fichas, pelos tokens e pelo Rolador —, inclusive o que já foi limpo do painel: ' +
      plural(mesa.total, 'rolagem', 'rolagens') + ', ' + plural(nDados, 'dado conferido', 'dados conferidos') + '. O auditor só lê; não muda nada. ',
      h('button', { type: 'button', class: 'btn small ghost', id: 'audDeNovo', onclick: () => carregar() }, 'Ler de novo')));
    if (mesa.impossiveis.length) {
      kids.push(h('div', { class: 'aud-alerta', id: 'audImpossiveis', role: 'alert' },
        h('strong', { text: plural(mesa.impossiveis.length, 'dado trouxe um valor que ele não tem', 'dados trouxeram um valor que eles não têm') + '.' }),
        h('span', { text: ' Isso não é azar nem sorte: é defeito do site, e vale avisar quem cuida dele. Ficaram fora das contas: ' +
          mesa.impossiveis.slice(0, 6).map((x) => x.dado[1] + ' num d' + x.dado[0] + ' (' + x.nome + ', ' + (ORIGENS[x.origem] || x.origem || 'mesa') + (x.quando ? ', ' + quando(x.quando) : '') + ')').join('; ') +
          (mesa.impossiveis.length > 6 ? '; e mais ' + (mesa.impossiveis.length - 6) + '.' : '.') })));
    }
    kids.push(h('div', { class: 'aud-filtros' },
      h('label', { class: 'aud-campo' }, h('span', { text: 'Quem rolou' }), selPessoa),
      h('label', { class: 'aud-campo' }, h('span', { text: 'Qual dado' }), selDado)));
    kids.push(h('div', { class: 'aud-veredito ' + v.nivel, id: 'audVeredito', role: 'status', 'data-nivel': v.nivel },
      h('strong', { text: v.titulo }), h('p', { text: v.texto }),
      c.n && v.nivel !== 'pouco' && !v.porAltura ? h('p', { class: 'aud-altura', text: lib.textoDaAltura(c.altura) }) : null));
    if (c.n) {
      kids.push(h('div', { class: 'aud-graf', id: 'audGrafico' }, grafico(c)),
        h('p', { class: 'aud-legenda' }, h('i', { class: 'lg barra' }), 'quantas vezes saiu', h('i', { class: 'lg esp' }), 'o esperado de um dado honesto', h('i', { class: 'lg faixa' }), 'onde costuma ficar (95% das vezes)',
          h('span', { class: 'lg-m', text: '▲▼' }), 'saiu dessa faixa'),
        c.desigual ? h('p', { class: 'note', id: 'audDesigual', text: 'As faixas não têm todas o mesmo esperado porque os dados têm tamanhos diferentes: um d6, por exemplo, não se espalha por igual em dez faixas. O traço de cada faixa já leva isso em conta.' }) : null,
        tabela(c));
    }
    // cada pessoa, com o dado escolhido (ou todos): quantos dados rolou, em que altura caíram, e o veredito dela
    if (mesa.pessoas.length > 1) {
      kids.push(h('h3', { class: 'aud-h', text: 'Por pessoa' + (filtro.lados ? ' · d' + filtro.lados : ' · todos os dados') }),
        h('table', { class: 'aud-tab pes', id: 'audPessoas' },
          h('thead', null, h('tr', null, h('th', { text: 'Quem rolou' }), h('th', { text: 'Dados' }), h('th', { text: 'Altura média' }), h('th', { text: 'Como está' }))),
          h('tbody', null, mesa.pessoas.map((p) => {
            const cp = lib.conferir(lib.recortar(mesa.rolagens, { pessoa: p.id }), filtro.lados || null);
            return h('tr', { class: filtro.pessoa === p.id ? 'atual' : null },
              h('td', null, h('button', { type: 'button', class: 'aud-link', title: 'Ver só as rolagens de ' + p.nome, onclick: () => { filtro.pessoa = filtro.pessoa === p.id ? '' : p.id; pintar(); } }, p.nome)),
              h('td', { text: mil(cp.n) }),
              h('td', { text: cp.n ? String(Math.round(cp.altura.media * 1000) / 10).replace('.', ',') + '%' : '—' }),
              h('td', null, h('span', { class: 'aud-chip ' + cp.veredito.nivel, text: NIVEIS[cp.veredito.nivel] })));
          }))),
        h('p', { class: 'note', text: 'A altura média diz em que ponto do dado os resultados caíram: 50% é o esperado; acima disso, a pessoa tirou números altos com mais frequência.' }));
    }
    kids.push(h('div', { class: 'aud-ler' }, h('strong', { text: 'Como ler' }),
      h('p', { text: 'Dado honesto também faz sequências estranhas. Por isso o auditor não olha uma rolagem: olha todas juntas e pergunta se a diferença entre o que saiu e o esperado é do tamanho que o acaso produz.' }),
      h('p', { text: 'Com dados honestos, mais ou menos 1 conferência em cada 20 dá "um pouco fora do comum" só por acaso — e quanto mais recortes você olha (cada pessoa, cada dado), mais fácil topar com uma dessas. "Fora do esperado" é mais raro: 1 em cada 100, ou menos.' }),
      h('p', { text: 'Todos os sorteios do site usam o gerador de números do próprio navegador, o mesmo usado em criptografia; cada aparelho sorteia as rolagens de quem está nele.' }),
      mesa.semDado || mesa.lidasDoTexto ? h('p', { text:
        (mesa.semDado ? plural(mesa.semDado, 'linha não traz dado para conferir', 'linhas não trazem dado para conferir') + ' (avisos, usos de item sem rolagem, e duelos antigos do Rolador, de que só os totais ficaram guardados). ' : '') +
        (mesa.lidasDoTexto ? plural(mesa.lidasDoTexto, 'rolagem antiga teve o dado lido', 'rolagens antigas tiveram os dados lidos') + ' do texto que aparece no painel; as novas guardam cada dado.' : '') }) : null));
    corpo.replaceChildren(...kids.filter(Boolean));
  }

  async function carregar() {
    const n = ++pedido;
    pintarEspera();
    try {
      const linhas = await window.TC.ponte.registro.ler();
      if (n !== pedido) return;
      mesa = A().juntar(linhas);
      pintar();
    } catch (e) {
      if (n !== pedido) return;
      mesa = null;
      $('audBody').replaceChildren(h('p', { class: 'aud-alerta', id: 'audErro', role: 'alert', text: (e && e.message) || 'Não deu para ler as rolagens da mesa agora.' }),
        h('button', { type: 'button', class: 'btn', onclick: () => carregar() }, 'Tentar de novo'));
    }
  }
  function abrir() {
    const dlg = $('audDlg');
    if (!dlg || !A() || !window.TC || !window.TC.ponte || !window.TC.ponte.registro) return false;
    filtro = { pessoa: '', lados: 0 };
    if (!dlg.open) dlg.showModal();
    carregar();
    return true;
  }
  window.RoladorAuditor = { abrir };
})();
