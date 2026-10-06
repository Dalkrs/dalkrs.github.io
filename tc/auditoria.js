/*
  TC.auditoria: o que os dados da mesa sortearam, e se isso cabe no que o acaso produz.

  Serve ao auditor do mestre (no Rolador). Este arquivo não mexe na tela: lê os dados de cada rolagem, conta as
  faces e faz as contas — o qui-quadrado, que compara o que saiu com o que se espera de um dado honesto.

  No navegador:  <script src="../tc/auditoria.js"></script>   →  window.TC.auditoria
  No Node:       const A = require('./tc/auditoria.js')

  Testes: node src/tests/auditoria.test.js
*/
(function (root) {
  'use strict';

  const MAX_LADOS = 1000000;
  const inteiro = (x) => Number.isSafeInteger(x);

  /* ================= os dados de uma rolagem ================= */
  /* Cada dado é um par [lados, valor]. `separar` divide uma lista em:
       bons    os que um dado daquele tamanho pode mostrar (1 ≤ valor ≤ lados, lados ≥ 2);
       ruins   os que ele não pode (0 num d20, 21 num d20): não entram nas contas, mas o auditor avisa que existem. */
  function separar(dd, max) {
    const bons = [], ruins = [];
    if (!Array.isArray(dd)) return { bons, ruins };
    const lim = inteiro(max) && max > 0 ? max : 200;
    for (const p of dd) {
      if (bons.length + ruins.length >= lim) break;
      if (!Array.isArray(p) || p.length !== 2 || !inteiro(p[0]) || !inteiro(p[1]) || p[0] < 1 || p[0] > MAX_LADOS || p[1] < 0 || p[1] > MAX_LADOS) continue;
      if (p[0] < 2) continue;                                   // dado de um lado só não sorteia nada
      (p[1] >= 1 && p[1] <= p[0] ? bons : ruins).push([p[0], p[1]]);
    }
    return { bons, ruins };
  }

  /* As rolagens de antes de a mesa guardar os dados um a um trazem só o texto que aparece no painel. Dele dá para
     tirar os dados, porque cada tipo de rolagem escreve sempre do mesmo jeito:
       "17 no d40 + 20 de fixa (atributo 60)"            fixa pela mesa, pelo Rolador ou por um token
       "FOR 60 · 1d40 + 20 → dado 17"                    rolagem rápida da ficha
       "… (1d40 + 20, dado 17) = 37 · … (1d35 + 5, dado 30) = 35"   disputa da ficha
       "2d6+3  2d6 [4, 4] +3"                            dados livres da ficha
       "Iniciativa · 1d20 (14) + 3"                      iniciativa (ficha e cenas)
       "2d6 + 3 → [4, 4] + 3"                            dados pela mesa, pelo Rolador, ou de uma poção
       "Encontros → Lobos (3 de 10)"                     sorteio numa tabela do Rolador (só com `tabela` = true: é um dado de 10 lados)
     Devolve os pares [lados, valor] como estão escritos (os impossíveis também: quem separa é `separar`).
     O que não dá para ler com certeza fica de fora: melhor contar menos do que contar errado. */
  function doResumo(texto, tabela) {
    const s = String(texto == null ? '' : texto).replace(/[−–]/g, '-');
    const out = [];
    const por = (lados, valor) => { out.push([Number(lados), Number(valor)]); };
    let m;
    if (tabela) { m = /\((\d+) de (\d+)\)\s*$/.exec(s); if (m) por(m[2], m[1]); return out; }      // (o texto do item pode ter qualquer coisa: só vale o fim)
    const r1 = /(\d+) no d(\d+)/g;
    while ((m = r1.exec(s))) por(m[2], m[1]);
    if (out.length) return out;
    const r2 = /\b1d(\d+)(?: \+ \d+)?(?: →|,) dado (\d+)/g;
    while ((m = r2.exec(s))) por(m[1], m[2]);
    if (out.length) return out;
    const r3 = /\b(\d+)d(\d+) \[([\d, ]*)\]/g;
    let incerto = false;
    while ((m = r3.exec(s))) {
      const vs = m[3].split(',').map((x) => x.trim()).filter(Boolean);
      if (vs.length !== Number(m[1])) incerto = true;
      for (const v of vs) por(m[2], v);
    }
    if (out.length || incerto) return incerto ? [] : out;
    const r4 = /\b1d(\d+) \((\d+)\)/g;
    while ((m = r4.exec(s))) por(m[1], m[2]);
    if (out.length) return out;
    // "2d6 + 3 → [4, 4] + 3": as partes NdM vêm antes da primeira lista; as listas, depois, na mesma ordem
    const i = s.indexOf('[');
    if (i < 0) return out;
    const partes = [], listas = [];
    const r5 = /\b(\d+)d(\d+)\b/g, r6 = /\[([^\]]*)\]/g, esq = s.slice(0, i), dir = s.slice(i);
    while ((m = r5.exec(esq))) partes.push([Number(m[1]), Number(m[2])]);
    while ((m = r6.exec(dir))) listas.push(m[1]);
    if (!listas.length || partes.length < listas.length) return [];
    const usadas = partes.slice(partes.length - listas.length);          // (o nome de um item pode ter "1d8" no meio: valem as últimas)
    for (let k = 0; k < listas.length; k++) {
      const n = usadas[k][0], lados = usadas[k][1], cortada = /…|\.\.\./.test(listas[k]);       // mais de 12 dados: o painel mostra os 12 primeiros
      const vs = listas[k].split(',').map((x) => x.trim()).filter((x) => /^\d+$/.test(x));
      if (cortada ? vs.length > n : vs.length !== n) return [];
      for (const v of vs) por(lados, v);
    }
    return out;
  }

  /* Os dados de uma linha do registro: os guardados (dd) ou, nas antigas, os tirados do texto.
     → { bons, ruins, lidos: true se vieram do texto } */
  function dadosDaLinha(l) {
    const dd = l && (Array.isArray(l.dd) ? l.dd : l.dados && Array.isArray(l.dados.dd) ? l.dados.dd : null);
    if (dd && dd.length) return Object.assign(separar(dd), { lidos: false });
    const resumo = l && (typeof l.resumo === 'string' ? l.resumo : l.dados && typeof l.dados.resumo === 'string' ? l.dados.resumo : '');
    const k = l && (l.k || (l.dados && l.dados.k));
    return Object.assign(separar(doResumo(resumo, k === 'tabela' && l.origem === 'rolador')), { lidos: true });
  }

  /* ================= contas ================= */
  /* ln Γ(x), pela aproximação de Lanczos (erro abaixo de 1e-10 para x > 0). */
  function lnGama(x) {
    const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    let y = x, t = x + 5.5, s = 1.000000000190015;
    t -= (x + 0.5) * Math.log(t);
    for (let j = 0; j < 6; j++) s += c[j] / ++y;
    return -t + Math.log(2.5066282746310005 * s / x);
  }
  /* Q(a, x): a cauda de cima da gama incompleta regularizada (série para x pequeno, fração contínua para x grande). */
  function gamaQ(a, x) {
    if (!(a > 0) || !(x >= 0)) return NaN;
    if (x === 0) return 1;
    if (x < a + 1) {
      let ap = a, soma = 1 / a, del = soma;
      for (let n = 0; n < 500; n++) { ap += 1; del *= x / ap; soma += del; if (Math.abs(del) < Math.abs(soma) * 1e-14) break; }
      return Math.max(0, Math.min(1, 1 - soma * Math.exp(-x + a * Math.log(x) - lnGama(a))));
    }
    const MIN = 1e-300;
    let b = x + 1 - a, c = 1 / MIN, d = 1 / b, h = d;
    for (let i = 1; i < 500; i++) {
      const an = -i * (i - a);
      b += 2;
      d = an * d + b; if (Math.abs(d) < MIN) d = MIN;
      c = b + an / c; if (Math.abs(c) < MIN) c = MIN;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-14) break;
    }
    return Math.max(0, Math.min(1, Math.exp(-x + a * Math.log(x) - lnGama(a)) * h));
  }
  /* A chance de um qui-quadrado com `gl` graus de liberdade dar `x2` ou mais, só por acaso. */
  function pQui(x2, gl) {
    if (!(gl > 0) || !(x2 > 0)) return 1;
    return gamaQ(gl / 2, x2 / 2);
  }

  /* Quantas vezes saiu cada face de um dado de `lados` lados → { n, obs } (obs[0] é a face 1). */
  function contarFaces(dados, lados) {
    const obs = new Array(lados).fill(0);
    let n = 0;
    for (const d of dados) if (d[0] === lados) { obs[d[1] - 1]++; n++; }
    return { n, obs, esp: obs.map(() => n / lados) };
  }
  /* Dados de tamanhos diferentes na mesma conta: cada resultado cai numa de `B` faixas do dado dele (a 1ª faixa são
     os 10% mais baixos, a última os 10% mais altos). O esperado de cada faixa soma, dado a dado, a parte das faces
     daquele dado que cai nela — um d6 não espalha por igual em 10 faixas, e a conta sabe disso. */
  const faixaDe = (lados, valor, B) => Math.min(B - 1, Math.floor((valor - 1) * B / lados));
  const partesMemo = new Map();
  function partesDoDado(lados, B) {
    const k = lados + '/' + B;
    let p = partesMemo.get(k);
    if (p) return p;
    p = new Array(B).fill(0);
    if (lados <= 5000) { for (let v = 1; v <= lados; v++) p[faixaDe(lados, v, B)] += 1 / lados; }
    else {
      // dado enorme: a faixa b vai da face ⌈b·lados/B⌉+1 … até ⌈(b+1)·lados/B⌉ (contas inteiras, sem percorrer as faces)
      let ant = 0;
      for (let b = 0; b < B; b++) { const ate = b === B - 1 ? lados : Math.ceil((b + 1) * lados / B); p[b] = (ate - ant) / lados; ant = ate; }
    }
    if (partesMemo.size < 5000) partesMemo.set(k, p);
    return p;
  }
  function emFaixas(dados, B) {
    B = inteiro(B) && B >= 2 ? B : 10;
    const obs = new Array(B).fill(0), esp = new Array(B).fill(0);
    let n = 0;
    for (const d of dados) {
      obs[faixaDe(d[0], d[1], B)]++; n++;
      const p = partesDoDado(d[0], B);
      for (let b = 0; b < B; b++) esp[b] += p[b];
    }
    return { n, obs, esp };
  }

  /* Em que altura do dado os resultados caíram, em média: 0 é sempre a face mais baixa, 1 é sempre a mais alta; um
     dado honesto dá 0,5. z diz a quantos desvios-padrão a média ficou do esperado (|z| < 2 é o comum). */
  function alturaMedia(dados) {
    let n = 0, soma = 0, vari = 0;
    for (const d of dados) { const L = d[0]; soma += (d[1] - 0.5) / L; vari += (L * L - 1) / (12 * L * L); n++; }
    if (!n) return { n: 0, media: null, z: 0 };
    return { n, media: soma / n, z: vari > 0 ? (soma - n / 2) / Math.sqrt(vari) : 0 };
  }

  /* Compara o que saiu (obs) com o esperado (esp), faixa a faixa.
     → { n, k, x2, gl, p, minEsp, barras: [{ i, obs, esp, de, ate, z }], piores }
       k        quantas faixas entram na conta (as de esperado zero ficam de fora)
       p        a chance de o acaso sozinho produzir uma diferença deste tamanho ou maior
       minEsp   o menor esperado entre as faixas: abaixo de 5, a conta ainda não é confiável
       barras   cada faixa, com o intervalo em que ela costuma ficar (de…ate: 95% das vezes) e o desvio z
       piores   as faixas que mais puxaram a diferença, da maior para a menor (só as com |z| ≥ 2) */
  function analisar(obs, esp) {
    let n = 0, x2 = 0, k = 0, minEsp = Infinity;
    for (let i = 0; i < obs.length; i++) n += obs[i];
    const barras = [];
    for (let i = 0; i < obs.length; i++) {
      const e = esp[i], o = obs[i];
      if (!(e > 0)) { barras.push({ i, obs: o, esp: 0, de: 0, ate: 0, z: 0 }); continue; }
      k++; minEsp = Math.min(minEsp, e);
      x2 += (o - e) * (o - e) / e;
      const dp = Math.sqrt(e * Math.max(0, 1 - e / n));
      barras.push({ i, obs: o, esp: e, de: Math.max(0, e - 1.96 * dp), ate: e + 1.96 * dp, z: dp > 0 ? (o - e) / dp : 0 });
    }
    const gl = Math.max(0, k - 1);
    const piores = barras.filter((b) => Math.abs(b.z) >= 2).sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
    return { n, k, x2, gl, p: n && gl ? pQui(x2, gl) : 1, minEsp: k ? minEsp : 0, barras, piores };
  }

  /* ================= o veredito, em palavras ================= */
  const umaEm = (p) => {
    if (!(p > 0)) return 'mais de um milhão';
    const n = 1 / p;
    if (n >= 1e6) return 'mais de um milhão';
    const r = n >= 1000 ? Math.round(n / 100) * 100 : n >= 100 ? Math.round(n / 10) * 10 : Math.round(n);
    return String(r).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };
  const virgula = (x) => String(Math.round(x * 10) / 10).replace('.', ',');
  /* Duas perguntas ao mesmo conjunto de dados:
       as faces   alguma face (ou faixa) saiu demais ou de menos? — o qui-quadrado de analisar();
       a altura   no conjunto, os resultados caíram mais alto (ou mais baixo) do que deviam? — a média de alturaMedia().
     Um dado "ajudado" para cima pode passar na primeira (nenhuma face destoa muito) e não passa na segunda. Como são
     duas perguntas, cada uma responde com metade da tolerância: juntas, acusam um dado honesto com a mesma raridade
     de uma só (5% para "um pouco fora do comum", 1% para "fora do esperado").
     a: o resultado de analisar(); m: o de alturaMedia(), ou nada; nomeFaixa(i) diz como chamar a faixa i.
     → { nivel, titulo, texto, p, porFaces, porAltura }
       nivel  'nada' (sem rolagens) · 'pouco' (ainda não dá para dizer) · 'ok' · 'atencao' · 'fora'
       p      a chance de dados honestos mostrarem uma diferença deste tamanho (já contando as duas perguntas) */
  function veredito(a, nomeFaixa, m) {
    const nome = typeof nomeFaixa === 'function' ? nomeFaixa : (i) => 'a faixa ' + (i + 1);
    if (!a || !a.n) return { nivel: 'nada', titulo: 'Ainda não há rolagens aqui', texto: 'Quando houver, o gráfico mostra quantas vezes saiu cada resultado.', p: 1, porFaces: false, porAltura: false };
    const podeFaces = a.k >= 2 && a.minEsp >= 5, podeAltura = !!m && m.n >= 30 && m.media != null;
    const perguntas = (podeFaces ? 1 : 0) + (podeAltura ? 1 : 0);
    const pF = podeFaces ? Math.min(1, a.p * perguntas) : 1, pA = podeAltura ? Math.min(1, pQui(m.z * m.z, 1) * perguntas) : 1;
    const p = Math.min(pF, pA), porFaces = podeFaces && pF < 0.05, porAltura = podeAltura && pA < 0.05;
    if (!podeFaces && !porAltura) {
      const falta = a.k >= 2 && a.minEsp > 0 ? Math.ceil(a.n * 5 / a.minEsp) : 0;
      return { nivel: 'pouco', titulo: 'Ainda são poucas rolagens para julgar', p: 1, porFaces: false, porAltura: false,
        texto: 'Com ' + a.n + (a.n === 1 ? ' dado rolado' : ' dados rolados') + ', as diferenças entre as faixas ainda são grandes mesmo num dado honesto.' +
          (falta > a.n ? ' Com cerca de ' + falta + ' já dá para dizer algo.' : '') + ' O gráfico mostra o que saiu até agora.' };
    }
    if (p >= 0.05) return { nivel: 'ok', titulo: 'Dentro do esperado', p, porFaces, porAltura,
      texto: 'As diferenças entre as faixas são do tamanho que o acaso costuma produzir. Nada aqui indica dado viciado.' };
    const motivos = [];
    if (porAltura) motivos.push('Em média, os resultados caíram mais ' + (m.z > 0 ? 'alto' : 'baixo') + ' do que deviam: em ' + virgula(m.media * 100) + '% da altura do dado (o esperado é 50%).');
    if (porFaces && a.piores.length) motivos.push('O que mais puxou: ' + a.piores.slice(0, 3).map((b) => nome(b.i) + ' saiu ' + b.obs + (b.obs === 1 ? ' vez' : ' vezes') + ' (o esperado era perto de ' + virgula(b.esp) + ')').join('; ') + '.');
    const porque = motivos.length ? ' ' + motivos.join(' ') : '';
    if (p >= 0.01) return { nivel: 'atencao', titulo: 'Um pouco fora do comum, mas ainda cabe no acaso', p, porFaces, porAltura,
      texto: 'Uma diferença deste tamanho aparece em cerca de 1 a cada ' + umaEm(p) + ' conferências de dados honestos. Não é sinal de problema por si só; vale olhar de novo quando houver mais rolagens.' + porque };
    return { nivel: 'fora', titulo: 'Fora do esperado', p, porFaces, porAltura,
      texto: 'Uma diferença deste tamanho só aparece em cerca de 1 a cada ' + umaEm(p) + ' conferências de dados honestos.' + porque + ' Vale conferir de onde vêm essas rolagens.' };
  }
  /* A altura média, em palavras (m: o resultado de alturaMedia). */
  function textoDaAltura(m) {
    if (!m || !m.n || m.media == null) return '';
    const pct = Math.round(m.media * 1000) / 10, txt = String(pct).replace('.', ',') + '%';
    const lado = m.z >= 0 ? 'acima' : 'abaixo';
    const quanto = Math.abs(m.z) < 2 ? 'dentro do que o acaso produz' : Math.abs(m.z) < 3 ? 'um pouco ' + lado + ' do comum' : 'bem ' + lado + ' do comum';
    return 'Em média, os resultados caíram em ' + txt + ' da altura do dado (o esperado é 50%): ' + quanto + '.';
  }

  /* ================= a mesa inteira ================= */
  /* linhas: as do registro (id, autor_id, autor_nome, origem, criado_em, dd | resumo…).
     → { rolagens: [{ id, autor, nome, origem, quando, dados }], total, semDado, impossiveis: [{ id, nome, origem, quando, dado }],
         lidasDoTexto, pessoas: [{ id, nome, n }], tamanhos: [{ lados, n }] }
       rolagens     só as que têm ao menos um dado conferível
       semDado      quantas rolagens não trazem dado nenhum (aviso, sorteio de tabela antigo, duelo do Rolador antigo)
       impossiveis  dados com um valor que aquele dado não tem — cada um é um defeito a investigar */
  function juntar(linhas) {
    const rolagens = [], impossiveis = [], pessoas = new Map(), tamanhos = new Map();
    let semDado = 0, lidasDoTexto = 0, total = 0;
    for (const l of Array.isArray(linhas) ? linhas : []) {
      if (!l || typeof l !== 'object') continue;
      total++;
      const d = dadosDaLinha(l), nome = String(l.autor_nome || '?'), quando = l.criado_em || null;
      for (const r of d.ruins) impossiveis.push({ id: l.id, nome, origem: l.origem || '', quando, dado: r });
      if (!d.bons.length) { semDado++; continue; }
      if (d.lidos) lidasDoTexto++;
      rolagens.push({ id: l.id, autor: l.autor_id || '', nome, origem: l.origem || '', quando, dados: d.bons });
      const p = pessoas.get(l.autor_id || '') || { id: l.autor_id || '', nome, n: 0 };
      p.nome = nome; p.n += d.bons.length; pessoas.set(p.id, p);
      for (const x of d.bons) tamanhos.set(x[0], (tamanhos.get(x[0]) || 0) + 1);
    }
    return { rolagens, total, semDado, impossiveis, lidasDoTexto,
      pessoas: [...pessoas.values()].sort((a, b) => b.n - a.n || a.nome.localeCompare(b.nome, 'pt-BR')),
      tamanhos: [...tamanhos.entries()].map(([lados, n]) => ({ lados, n })).sort((a, b) => b.n - a.n || a.lados - b.lados) };
  }
  /* Os dados de um recorte: de uma pessoa (ou de todas) e de um tamanho de dado (ou de todos). */
  function recortar(rolagens, o) {
    const pessoa = o && o.pessoa != null && o.pessoa !== '' ? o.pessoa : null, lados = o && o.lados ? Number(o.lados) : null, out = [];
    for (const r of rolagens) {
      if (pessoa !== null && r.autor !== pessoa) continue;
      for (const d of r.dados) if (!lados || d[0] === lados) out.push(d);
    }
    return out;
  }
  /* A conferência de um recorte, pronta para desenhar.
     Um tamanho só, com até 30 lados: uma barra por face. Dado maior, ou todos juntos: 10 faixas.
     → { modo: 'faces' | 'faixas', lados, n, analise, veredito, altura, rotulos: [texto de cada barra], desigual } */
  function conferir(dados, lados) {
    const L = lados ? Number(lados) : null;
    const porFace = !!L && L <= 30;
    const c = porFace ? contarFaces(dados, L) : emFaixas(L ? dados.filter((d) => d[0] === L) : dados, 10);
    const a = analisar(c.obs, c.esp);
    const rotulos = porFace ? c.obs.map((_, i) => String(i + 1))
      : c.obs.map((_, i) => (L ? (Math.ceil(i * L / 10) + 1) + '–' + (i === 9 ? L : Math.ceil((i + 1) * L / 10)) : (i * 10) + '–' + ((i + 1) * 10) + '%'));      // (as faces de cada faixa: as mesmas contas de faixaDe)
    const nomeFaixa = porFace ? (i) => 'o ' + (i + 1)
      : L ? (i) => 'a faixa ' + rotulos[i]
        : (i) => (i === 0 ? 'a faixa mais baixa (os 10% de baixo de cada dado)' : i === 9 ? 'a faixa mais alta (os 10% de cima de cada dado)' : 'a faixa de ' + rotulos[i]);
    const usados = L ? dados.filter((d) => d[0] === L) : dados, altura = alturaMedia(usados);
    // (juntando dados de tamanhos diferentes, as faixas não têm todas o mesmo esperado: um d6 não se espalha por igual em dez)
    const desigual = !porFace && a.barras.some((b) => b.esp > 0) && (() => { const es = a.barras.filter((b) => b.esp > 0).map((b) => b.esp); return Math.max(...es) > Math.min(...es) * 1.15; })();
    return { modo: porFace ? 'faces' : 'faixas', lados: L, n: a.n, analise: a, veredito: veredito(a, nomeFaixa, altura), altura, rotulos, desigual };
  }

  const api = Object.freeze({ separar, doResumo, dadosDaLinha, pQui, contarFaces, emFaixas, alturaMedia, analisar, veredito, textoDaAltura, juntar, recortar, conferir });
  const TC = (root.TC = root.TC || {});
  TC.auditoria = api;
  if (typeof module !== 'undefined' && module && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
