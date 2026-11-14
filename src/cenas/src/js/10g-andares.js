/* ---------------------------------------------------------------
   10g-andares. OS ANDARES DE UM PRÉDIO GERADO (lote 141) — a parte da janela que os dois geradores de prédio usam
   (o "Gerar o interior", 10g, e a Furtividade, 10gc):
     · quantos andares em cima (0 a 5, além do térreo) e quantos de porão (0 a 2);
     · a base secreta no porão: com 1 porão, ele se divide (a base fica atrás de uma parede secreta); com 2, o 1º porão é
       comum e o 2º é a base (a escada para ela fica escondida, só o mestre vê);
     · as salas de cada andar: o mestre escolhe um tema (que preenche a lista) e depois tira e põe salas (os chips).
   Guarda a escolha num objeto simples, `a`:
     { cima: 0–5, porao: 0–2, base: true/false, temas: { nível: id do tema }, salas: { nível: [papéis], base: [papéis] } }
   `cat` (de cada gerador) diz as salas e os temas que ele sabe fazer:
     { salas: [papéis], cima: { tema: { n, lista } }, porao: { tema: { n, lista } }, base: [papéis da base],
       padrao(n, N): o tema de um andar (n ≥ 1, N andares em cima; n < 0 no porão) }
   --------------------------------------------------------------- */
const PlantaAndares = (() => {
  const NOMES = {
    sala: 'Sala', quarto: 'Quarto', quartoSenhor: 'Quarto do senhor', banheiro: 'Banheiro', cozinha: 'Cozinha', despensa: 'Despensa',
    deposito: 'Depósito', armazem: 'Armazém', criados: 'Quarto dos criados', escritorio: 'Escritório', biblioteca: 'Biblioteca',
    arquivo: 'Arquivo', galeria: 'Galeria', salao: 'Salão', nobre: 'Salão nobre', capela: 'Capela', vestibulo: 'Vestíbulo',
    dormitorio: 'Dormitório', refeitorio: 'Refeitório', arsenal: 'Arsenal', comandante: 'Sala do comandante', guarda: 'Sala da guarda',
    cela: 'Cela', sotao: 'Sótão', adega: 'Adega', loja: 'Loja', forja: 'Forja', vigia: 'Sala do vigia',
    misteriosa: 'Sala misteriosa', secreta: 'Sala secreta', reuniao: 'Sala de reunião (com o mapa)', laboratorio: 'Laboratório de alquimia', cofre: 'Cofre', cofreForte: 'Cofre', tunel: 'Túnel de fuga',
    // (lote 158) as salas dos temas
    tavernaSalao: 'Salão da taverna', aula: 'Sala de magia', interrogatorio: 'Sala de interrogatório', treino: 'Sala de treino', portal: 'Sala do portal', teatro: 'Teatro',
  };
  const nome = p => NOMES[p] || p;
  const MAX_SALAS = 12;
  const nomeAndar = n => (n === -1 ? '1º porão' : n === -2 ? '2º porão' : n === 0 ? 'térreo' : n + 'º andar');

  // a escolha, conferida (o que vem de fora — uma escolha guardada, o de antes — não quebra a janela)
  function normalizar(a, cat, velho) {
    a = a && typeof a === 'object' ? a : {};
    velho = velho || {};
    const max = cat.maxCima == null ? 5 : cat.maxCima;
    const int = (v, lo, hi, d) => (Number.isInteger(v) ? clamp(v, lo, hi) : d);
    const out = {
      cima: int(a.cima, 0, max, int(velho.cima, 0, max, 0)),
      porao: int(a.porao, 0, 2, velho.porao === true ? 1 : int(velho.porao, 0, 2, 0)),
      base: a.base === true,
      temas: {}, salas: {},
    };
    if (!out.porao) out.base = false;
    const okSala = (lst, vale) => (Array.isArray(lst) ? lst.filter(p => typeof p === 'string' && vale.includes(p)).slice(0, MAX_SALAS) : null);
    if (a.temas && typeof a.temas === 'object') for (const k of Object.keys(a.temas)) { const n = Number(k), t = a.temas[k]; if (Number.isInteger(n) && typeof t === 'string' && (n > 0 ? cat.cima[t] : cat.porao[t])) out.temas[n] = t; }
    if (a.salas && typeof a.salas === 'object') for (const k of Object.keys(a.salas)) {
      if (k === 'base') { const l = okSala(a.salas.base, cat.base); if (l) out.salas.base = l; continue; }
      const n = Number(k), l = okSala(a.salas[k], cat.salas); if (Number.isInteger(n) && n !== 0 && l) out.salas[n] = l;
    }
    return out;
  }
  const temaDe = (a, cat, n) => a.temas[n] || cat.padrao(n, a.cima);
  // as salas de um andar (a lista do mestre, ou a do tema)
  function salasDe(a, cat, n) {
    if (n === 'base') return a.salas.base ? a.salas.base.slice() : cat.base.slice();
    if (a.salas[n]) return a.salas[n].slice();
    const T = (n > 0 ? cat.cima : cat.porao)[temaDe(a, cat, n)];
    return T ? T.lista.slice() : [];
  }
  // os níveis que existem, de cima para baixo (sem o térreo); o 2º porão com base é a própria base
  const niveis = a => { const l = []; for (let n = a.cima; n >= 1; n--) l.push(n); for (let n = -1; n >= -a.porao; n--) l.push(n); return l; };
  // o que cada nível é: 'comum' | 'base' (o 2º porão inteiro) | 'dividido' (o 1º porão, com a base atrás da parede)
  const papelDoNivel = (a, n) => (n >= 0 || !a.base ? 'comum' : a.porao === 2 ? (n === -2 ? 'base' : 'comum') : 'dividido');
  // o resumo, para a janela e o aviso: "térreo + 2 andares, 1º porão (com a base secreta)"
  function resumo(a) {
    const p = [];
    if (a.cima) p.push(a.cima === 1 ? '1 andar em cima' : a.cima + ' andares em cima');
    if (a.porao) p.push((a.porao === 1 ? '1 porão' : '2 porões') + (a.base ? ' (com a base secreta)' : ''));
    return p.length ? 'térreo + ' + p.join(', ') : 'só o térreo';
  }

  /* A janela: os andares, o porão, a base e as salas de cada um. mudou(a) chama o gerador de novo. */
  function ui(a, cat, mudou, pre) {
    pre = pre || 'and';
    const K = UI.kit, wrap = h('div', { class: 'and', id: pre + '-and' });
    const muda = () => { pintar(); mudou(a); };
    function linha(n, rotulo, ehBase) {
      const lista = salasDe(a, cat, ehBase ? 'base' : n), chave = ehBase ? 'base' : n;
      const tira = i => { const l = salasDe(a, cat, chave); l.splice(i, 1); a.salas[chave] = l; muda(); };
      const poe = p => { if (!p) return; const l = salasDe(a, cat, chave); if (l.length >= MAX_SALAS) { UI.toast(`No máximo ${MAX_SALAS} salas num andar.`); return; } l.push(p); a.salas[chave] = l; muda(); };
      const temas = ehBase ? null : (n > 0 ? cat.cima : cat.porao);
      const vale = ehBase ? cat.base : cat.salas;
      const idn = ehBase ? 'base' : (n > 0 ? 'c' + n : 'p' + (-n));
      return h('div', { class: 'and-l' + (ehBase ? ' base' : ''), id: `${pre}-l-${idn}` },
        h('div', { class: 'and-c' }, h('b', { text: rotulo }),
          temas ? K.inSelect(`${pre}-tema-${idn}`, temaDe(a, cat, n), Object.keys(temas).map(k => [k, temas[k].n]), v => { a.temas[n] = v; delete a.salas[n]; muda(); }, { 'aria-label': 'O tema de ' + rotulo, title: 'Escolher um tema troca a lista de salas deste andar' }) : null),
        h('div', { class: 'and-chips' },
          lista.length ? lista.map((p, i) => h('span', { class: 'chip and-chip' }, h('span', { text: nome(p) }),
            h('button', { type: 'button', class: 'and-x', 'aria-label': 'Tirar ' + nome(p), title: 'Tirar ' + nome(p), onclick: () => tira(i) }, '×')))
            : h('span', { class: 'note', text: 'Sem salas: o gerador usa as de sempre.' }),
          K.inSelect(`${pre}-mais-${idn}`, '', [['', '+ sala']].concat(vale.map(p => [p, nome(p)])), poe, { 'aria-label': 'Pôr uma sala em ' + rotulo, class: 'in and-mais' })));
    }
    function pintar() {
      const kids = [
        K.field('Andares de cima', K.seg(pre + '-cima', a.cima, Array.from({ length: (cat.maxCima == null ? 5 : cat.maxCima) + 1 }, (_, i) => [i, i === 0 ? 'Nenhum' : String(i), null, i === 0 ? 'Só o térreo' : i + (i === 1 ? ' andar' : ' andares') + ' acima do térreo']), v => { a.cima = v; muda(); }), 'stack'),
        K.field('Porão', K.seg(pre + '-porao', a.porao, [[0, 'Sem'], [1, '1 andar'], [2, '2 andares']], v => { a.porao = v; if (!v) a.base = false; muda(); }), 'stack'),
        a.porao ? K.toggle(pre + '-base', a.base, v => { a.base = v; muda(); }, a.porao === 1 ? 'Base secreta (o porão se divide: a base fica atrás de uma parede secreta)' : 'Base secreta (o 2º porão; a escada para ele fica escondida)') : null,
      ];
      const ls = niveis(a);
      if (ls.length) {
        const blocos = [];
        for (const n of ls) {
          const pp = papelDoNivel(a, n);
          if (pp === 'base') blocos.push(linha(n, 'Base secreta (2º porão)', true));
          else {
            blocos.push(linha(n, n < 0 && pp === 'dividido' ? nomeAndar(n) + ' (a parte comum)' : nomeAndar(n), false));
            if (pp === 'dividido') blocos.push(linha(n, 'Base secreta (atrás da parede)', true));
          }
        }
        kids.push(h('div', { class: 'and-ls', role: 'group', 'aria-label': 'As salas de cada andar' }, h('p', { class: 'note', text: 'As salas de cada andar: escolha um tema, depois tire (×) ou ponha (+ sala). Se não couber tudo, ficam as primeiras da lista.' }), ...blocos));
      }
      wrap.replaceChildren(...kids.filter(Boolean));
    }
    pintar();
    return wrap;
  }
  return { NOMES, nome, nomeAndar, normalizar, salasDe, temaDe, niveis, papelDoNivel, resumo, ui, MAX_SALAS };
})();
