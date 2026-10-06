/*
  TC.dice: o serviço de dados da mesa, compartilhado entre as páginas.

  As regras, os limites e os textos vieram do Rolador de Urgm
  (src/legado/rolador-urgm.html) e continuam iguais aos de lá.
  Este arquivo não mexe na tela: só sorteia, confere e monta textos e registros.

  No navegador:  <script src="tc/dice.js"></script>   →  window.TC.dice
  No Node:       const dice = require('./tc/dice.js')

  Testes: node src/tests/dice.test.js
*/
(function (root) {
  'use strict';

  /* ================= constantes ================= */
  const MAX_NUM = 9999999;
  const RANGE = 4294967296; // 2^32: quantos valores um sorteio de 32 bits alcança
  const DEFAULT_SIDE_NAMES = ['Ataque', 'Defesa'];
  const NO_EXPR = 'Escreva os dados (ex.: 2d6+3).';

  /* Mapa sem protótipo: nomes como "constructor" não passam por chave válida. */
  function lookup(pairs) { return Object.freeze(Object.assign(Object.create(null), pairs)); }

  const COLORS = Object.freeze([
    { id: 'vermelho', name: 'Vermelho', hex: '#ef5350' },
    { id: 'laranja',  name: 'Laranja',  hex: '#ff8a3d' },
    { id: 'amarelo',  name: 'Amarelo',  hex: '#f5cf4f' },
    { id: 'verde',    name: 'Verde',    hex: '#5cc26b' },
    { id: 'turquesa', name: 'Turquesa', hex: '#2fc4bd' },
    { id: 'azul',     name: 'Azul',     hex: '#5aa2ff' },
    { id: 'roxo',     name: 'Roxo',     hex: '#a67cf2' },
    { id: 'rosa',     name: 'Rosa',     hex: '#f06aa8' },
  ].map((c) => Object.freeze(c)));
  const COLOR = Object.create(null);
  COLORS.forEach((c) => { COLOR[c.id] = c; });

  /* ================= sorteio ================= */
  const hasCrypto = !!(root.crypto && typeof root.crypto.getRandomValues === 'function');

  /* Inteiro uniforme de 1 a n, com o gerador criptográfico (Math.random só quando ele não existe). */
  function randInt(n) {
    // Acima de 2^32 um sorteio de 32 bits não alcança todos os valores; recusa em vez de ficar tentando para sempre.
    if (!Number.isSafeInteger(n) || n < 1 || n > RANGE) throw new RangeError('randInt: n inválido');
    if (n === 1) return 1;
    if (!hasCrypto) return 1 + Math.floor(Math.random() * n);
    const limit = RANGE - (RANGE % n); // descarta a sobra para não viciar o resultado
    const buf = new Uint32Array(1);
    let x;
    do { root.crypto.getRandomValues(buf); x = buf[0]; } while (x >= limit);
    return 1 + (x % n);
  }

  function uid(prefix) {
    let r;
    if (hasCrypto) { const b = new Uint32Array(2); root.crypto.getRandomValues(b); r = b[0].toString(36) + b[1].toString(36); }
    else r = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
    return prefix + '_' + Date.now().toString(36) + r;
  }

  /* ================= texto ================= */
  function fold(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function capital(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function lowerFirst(s) { return s.charAt(0).toLowerCase() + s.slice(1); }
  function clip(s) { return s.length > 24 ? s.slice(0, 24) + '…' : s; } // trecho citado numa mensagem de erro

  /* Itens de uma tabela { text }: um por linha; linhas vazias são ignoradas. */
  function tableItems(t) { return String(t.text || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean); }

  /* ================= dados livres ================= */
  function tokenizeDice(input) {
    const src = String(input || '').replace(/[−‒–—]/g, '-').replace(/d%/gi, 'd100');
    if (!src.trim()) return { empty: true, terms: [] };
    const re = /\s*([+-])?\s*(?:(\d*)[dD](\d+)|(\d+))\s*/y;
    const terms = [];
    let pos = 0;
    while (pos < src.length) {
      re.lastIndex = pos;
      const m = re.exec(src);
      if (!m) {
        const rest = src.slice(pos).trim();
        if (rest === '+' || rest === '-') return { error: 'Falta completar depois do “' + (rest === '-' ? '−' : '+') + '”.' };
        return { error: 'Não entendi “' + rest + '”. Escreva algo como 2d6+3.' };
      }
      if (terms.length && !m[1]) return { error: 'Falta um + ou − antes de “' + m[0].trim() + '”.' };
      const sign = m[1] === '-' ? -1 : 1;
      if (m[3] !== undefined) terms.push({ kind: 'dice', sign, count: m[2] === '' ? 1 : Number(m[2]), sides: Number(m[3]) });
      else terms.push({ kind: 'num', sign, value: Number(m[4]) });
      pos = re.lastIndex;
    }
    return { terms };
  }

  function displayTerms(terms) {
    return terms.map((t, i) => {
      const body = t.kind === 'dice' ? t.count + 'd' + t.sides : String(t.value);
      if (i === 0) return (t.sign < 0 ? '−' : '') + body;
      return (t.sign < 0 ? ' − ' : ' + ') + body;
    }).join('');
  }
  function compactTerms(terms) {
    return terms.map((t, i) => {
      const body = t.kind === 'dice' ? t.count + 'd' + t.sides : String(t.value);
      return (t.sign < 0 ? '-' : (i === 0 ? '' : '+')) + body;
    }).join('');
  }

  function parseDice(input) {
    const tk = tokenizeDice(input);
    if (tk.empty) return { empty: true };
    if (tk.error) return { error: tk.error };
    const terms = tk.terms;
    if (terms.length > 20) return { error: 'Use no máximo 20 partes numa rolagem só.' };
    let dice = 0;
    for (const t of terms) {
      if (t.kind === 'dice') {
        if (t.count < 1) return { error: 'A quantidade de dados precisa ser pelo menos 1.' };
        if (t.count > 100) return { error: 'Use no máximo 100 dados iguais de uma vez.' };
        if (t.sides < 2) return { error: 'O dado precisa ter pelo menos 2 lados.' };
        if (t.sides > 100000) return { error: 'O dado pode ter no máximo 100000 lados.' };
        dice += t.count;
      } else if (t.value > 1000000) return { error: 'Esse modificador é grande demais.' };
    }
    if (!dice) return { error: 'Falta o dado. Escreva algo como 1d20 ou 2d6+3.' };
    if (dice > 300) return { error: 'São dados demais numa rolagem só (máximo 300).' };
    let min = 0, max = 0;
    for (const t of terms) {
      if (t.kind === 'dice') {
        if (t.sign > 0) { min += t.count; max += t.count * t.sides; }
        else { min -= t.count * t.sides; max -= t.count; }
      } else { min += t.sign * t.value; max += t.sign * t.value; }
    }
    return { terms, min, max, norm: displayTerms(terms) };
  }

  function rollTerms(terms) {
    const out = terms.map((t) => (t.kind === 'dice'
      ? { kind: 'dice', sign: t.sign, count: t.count, sides: t.sides, rolls: Array.from({ length: t.count }, () => randInt(t.sides)) }
      : { kind: 'num', sign: t.sign, value: t.value }));
    const total = out.reduce((acc, t) => acc + t.sign * (t.kind === 'dice' ? t.rolls.reduce((a, b) => a + b, 0) : t.value), 0);
    return { terms: out, total };
  }
  function bareTerms(terms) {
    return terms.map((t) => (t.kind === 'dice' ? { kind: 'dice', sign: t.sign, count: t.count, sides: t.sides } : { kind: 'num', sign: t.sign, value: t.value }));
  }

  /* Lê e rola de uma vez: "2d6+3" → { ok, expr, terms, total, min, max }. */
  function rollExpr(text) {
    const p = parseDice(text);
    if (p.empty) return { ok: false, error: NO_EXPR };
    if (p.error) return { ok: false, error: p.error };
    const r = rollTerms(p.terms);
    return { ok: true, expr: p.norm, terms: r.terms, total: r.total, min: p.min, max: p.max };
  }

  /* ================= comparadores (>, ≥, =, ≤, <) ================= */
  const OPS = lookup({
    '>=': Object.freeze({ sym: '≥', label: '≥ igual ou maior', short: (t) => t + ' ou mais', test: (v, t) => v >= t }),
    '>':  Object.freeze({ sym: '>', label: '> maior que',      short: (t) => 'mais que ' + t, test: (v, t) => v > t }),
    '=':  Object.freeze({ sym: '=', label: '= igual a',        short: (t) => 'exatamente ' + t, test: (v, t) => v === t }),
    '<=': Object.freeze({ sym: '≤', label: '≤ igual ou menor', short: (t) => t + ' ou menos', test: (v, t) => v <= t }),
    '<':  Object.freeze({ sym: '<', label: '< menor que',      short: (t) => 'menos que ' + t, test: (v, t) => v < t }),
  });
  /* Como o sinal pode ser escrito no chat ou vir de um formulário. */
  const OP_ALIAS = lookup({ '>=': '>=', '>': '>', '=': '=', '<=': '<=', '<': '<', '≥': '>=', '≤': '<=' });
  const OP_HINT = 'Use >=, >, =, <= ou <.';

  function readSigned(raw) {
    const s = String(raw || '').trim().replace(/[−–]/g, '-');
    if (!s) return { empty: true };
    if (!/^-?\d+$/.test(s)) return { bad: true };
    const n = Number(s);
    if (Math.abs(n) > MAX_NUM) return { big: true };
    return { value: n };
  }

  function normCheck(c) {
    if (!c || typeof c !== 'object' || !OPS[c.op] || !Number.isSafeInteger(c.target)) return null;
    return { op: c.op, target: c.target };
  }

  /*
    Diz se passou e explica a margem em palavras: { pass, text } ou null quando não há comparação.
    Chamada: evalCheck(total, check). A ordem do rolador, (check, total), também é aceita.
  */
  function evalCheck(a, b) {
    const totalFirst = typeof a === 'number' && typeof b !== 'number';
    const check = totalFirst ? b : a;
    const total = totalFirst ? a : b;
    if (!check || !OPS[check.op]) return null;
    const t = check.target;
    const op = check.op;
    const pass = OPS[op].test(total, t);
    let detail;
    if (op === '=') detail = pass ? 'exatamente ' + t : 'diferença de ' + Math.abs(total - t);
    else if (op === '>=' || op === '>') {
      const need = op === '>' ? t + 1 : t;
      if (pass) detail = total === need && op === '>=' ? 'no limite' : 'por ' + (total - t);
      else { const miss = need - total; detail = miss === 1 ? 'faltou 1' : 'faltaram ' + miss; }
    } else {
      const lim = op === '<' ? t - 1 : t;
      if (pass) detail = total === lim && op === '<=' ? 'no limite' : 'por ' + (t - total);
      else detail = 'passou do limite por ' + (total - lim);
    }
    return { pass, text: OPS[op].sym + ' ' + t + ', ' + detail };
  }

  /* O veredito inteiro, do jeito que o rolador mostra: "✓ Passou ≥ 45, por 3". */
  function verdict(total, check) {
    const res = evalCheck(total, check);
    if (!res) return null;
    return { passed: res.pass, text: (res.pass ? '✓ Passou' : '✗ Não passou') + ' ' + res.text };
  }

  /* 'never' quando não tem como passar, 'always' quando sempre passa (costuma ser erro de digitação). */
  function checkReach(check, min, max) {
    if (!check || min == null || max == null) return null;
    const t = check.target;
    switch (check.op) {
      case '>=': return min >= t ? 'always' : max < t ? 'never' : null;
      case '>': return min > t ? 'always' : max <= t ? 'never' : null;
      case '=': return (t < min || t > max) ? 'never' : (min === max ? 'always' : null);
      case '<=': return max <= t ? 'always' : min > t ? 'never' : null;
      case '<': return max < t ? 'always' : min >= t ? 'never' : null;
      default: return null;
    }
  }

  /* Alvo que pode vir como número (aí o 0 vale como valor, não como campo vazio). */
  function signedArg(raw) {
    if (typeof raw === 'number') {
      if (!Number.isInteger(raw)) return { bad: true };
      return Math.abs(raw) > MAX_NUM ? { big: true } : { value: raw || 0 };
    }
    return raw == null || typeof raw === 'string' ? readSigned(raw) : { bad: true };
  }

  /*
    Lê "sinal + alvo": { check: { op, target } }, { check: null } ou { error }.
    Alvo vazio = sem comparação. Sem sinal, vale ≥ (o sinal que o rolador deixa escolhido).
  */
  function readCheck(op, alvo) {
    const r = signedArg(alvo);
    if (r.empty) return { check: null };
    if (r.bad) return { error: 'O alvo só aceita número inteiro (sem letra, vírgula ou ponto).' };
    if (r.big) return { error: 'Esse alvo é grande demais.' };
    const key = op == null || op === '' ? '>=' : OP_ALIAS[op];
    if (!key) return { error: 'Não entendi o sinal “' + clip(String(op)) + '”. ' + OP_HINT };
    return { check: { op: key, target: r.value } };
  }

  /* ================= fixa ================= */
  function readInt(raw) {
    const s = String(raw || '').trim();
    if (!s) return { empty: true };
    if (!/^\d+$/.test(s)) return { bad: true };
    const n = Number(s);
    if (n > MAX_NUM) return { big: true };
    return { value: n };
  }

  /* Atributo ou fixa que pode vir como número (aí o 0 vale como valor, não como campo vazio). */
  function intArg(raw) {
    if (typeof raw === 'number') {
      if (!Number.isInteger(raw) || raw < 0) return { bad: true };
      return raw > MAX_NUM ? { big: true } : { value: raw || 0 };
    }
    return raw == null || typeof raw === 'string' ? readInt(raw) : { bad: true };
  }

  function problem(field, text) { return { ok: false, level: 'problem', field, text }; }
  function guide(field, text) { return { ok: false, level: 'hint', field, text }; }

  /*
    Valida atributo + fixa (texto de um campo ou número). O texto sai com inicial minúscula
    para caber depois do prefix do duelo ("Ataque: ..."); "field" diz qual dos dois está errado.
  */
  function validateFixa(atributo, fixaRaw, prefix) {
    prefix = prefix || '';
    const a = intArg(atributo);
    const f = intArg(fixaRaw);
    if (a.bad) return problem('atributo', prefix + 'o atributo só aceita número inteiro (sem letra, vírgula ou ponto).');
    if (a.big) return problem('atributo', prefix + 'esse atributo é grande demais.');
    if (f.bad) return problem('fixa', prefix + 'a fixa só aceita número inteiro (sem letra, vírgula ou ponto).');
    if (f.big) return problem('fixa', prefix + 'essa fixa é grande demais.');
    if (a.empty) return guide('atributo', prefix + 'digite o atributo e quanto quer fixar.');
    if (a.value < 1) return problem('atributo', prefix + 'o atributo precisa ser pelo menos 1.');
    const fixa = f.empty ? 0 : f.value;
    if (fixa > a.value) return problem('fixa', prefix + 'a fixa (' + fixa + ') passou do atributo (' + a.value + '). Ela pode ir no máximo até ' + a.value + '.');
    const die = a.value - fixa;
    const min = die === 0 ? a.value : fixa + 1;
    const roll = die === 0 ? 'fixa total ' + a.value : fixa === 0 ? '1d' + die + ', sem fixa' : '1d' + die + ' + ' + fixa;
    return { ok: true, atributo: a.value, fixa, die, min, max: a.value, roll };
  }

  /* A regra da fixa: rola um dado de (atributo − fixa) lados e soma a fixa. Fixa igual ao atributo não rola nada. */
  function rollFixa(atributo, fixa) {
    const v = validateFixa(atributo, fixa, '');
    if (!v.ok) return { ok: false, error: capital(v.text) };
    const dieValue = v.die > 0 ? randInt(v.die) : 0;
    return { ok: true, atributo: v.atributo, fixa: v.fixa, die: v.die, dieValue, total: dieValue + v.fixa };
  }

  /* ================= tabela ================= */
  /* Sorteia um item. Aceita a lista de itens, o texto com um item por linha ou a tabela { name, text }. */
  function rollTable(itemsOrText) {
    const x = itemsOrText;
    let items = [];
    let name = '';
    if (Array.isArray(x)) items = x.map((s) => (typeof s === 'string' ? s.trim() : typeof s === 'number' ? String(s) : '')).filter(Boolean);
    else if (typeof x === 'string') items = tableItems({ text: x });
    else if (x && typeof x === 'object') { items = tableItems(x); name = typeof x.name === 'string' ? x.name : ''; }
    if (!items.length) return { ok: false, error: name ? 'A tabela “' + name + '” está vazia.' : 'A tabela está vazia.' };
    const index = randInt(items.length);
    return { ok: true, itemCount: items.length, itemIndex: index, itemText: items[index - 1] };
  }

  /* ================= composição em texto ================= */
  /* Aceita (atributo, fixa, dieValue) ou a rolagem inteira. */
  function fixaComp(atributo, fixa, dieValue) {
    if (atributo && typeof atributo === 'object') { const e = atributo; atributo = e.atributo; fixa = e.fixa; dieValue = e.dieValue; }
    const die = atributo - fixa;
    if (die === 0) return 'Fixa total de ' + fixa + ', sem rolar dado (atributo ' + atributo + ')';
    if (fixa === 0) return dieValue + ' no d' + die + ', sem fixa (atributo ' + atributo + ')';
    return dieValue + ' no d' + die + ' + ' + fixa + ' de fixa (atributo ' + atributo + ')';
  }

  /* Aceita a lista de partes roladas ou a rolagem inteira. Sem "full", mostra só os 12 primeiros dados de cada parte. */
  function dadosComp(terms, full) {
    if (!Array.isArray(terms)) terms = (terms && terms.terms) || [];
    return terms.map((t, i) => {
      const op = i === 0 ? (t.sign < 0 ? '−' : '') : (t.sign < 0 ? ' − ' : ' + ');
      if (t.kind === 'num') return op + t.value;
      const rolls = t.rolls || [];
      const list = !full && rolls.length > 12 ? rolls.slice(0, 12).join(', ') + ', …' : rolls.join(', ');
      return op + t.count + 'd' + t.sides + ' (' + list + ')';
    }).join('');
  }

  function lastRound(e) { return e.rounds[e.rounds.length - 1]; }

  function duelSummary(e) {
    const r = lastRound(e);
    if (e.winner == null) return 'Empate em ' + r[0].total + '.';
    const w = e.sides[e.winner].name;
    if (e.decidedBy === 'mestre') return 'Empate em ' + r[0].total + ': o mestre deu a vitória para ' + w + '.';
    const extra = e.rounds.length > 1 ? ' (desempate na ' + e.rounds.length + 'ª rodada)' : '';
    return w + ' venceu por ' + Math.abs(r[0].total - r[1].total) + extra + '.';
  }

  function compText(e, full) {
    if (e.mode === 'fixa') return fixaComp(e.atributo, e.fixa, e.dieValue);
    if (e.mode === 'dados') return dadosComp(e.terms, full);
    if (e.mode === 'duelo') return e.sides[0].name + ' × ' + e.sides[1].name + ': ' + duelSummary(e);
    return 'Tabela “' + e.tableName + '”, item ' + e.itemIndex + ' de ' + e.itemCount;
  }

  /* Só os resultados, na ordem da rolagem: "[5, 1] + 3". */
  function rollsLine(terms, full) {
    return terms.map((t, i) => {
      const op = i === 0 ? (t.sign < 0 ? '−' : '') : (t.sign < 0 ? ' − ' : ' + ');
      if (t.kind === 'num') return op + t.value;
      const rolls = t.rolls || [];
      return op + '[' + (!full && rolls.length > 12 ? rolls.slice(0, 12).join(', ') + ', …' : rolls.join(', ')) + ']';
    }).join('');
  }

  function hasRounds(e) {
    return Array.isArray(e.sides) && e.sides.length === 2 && !!e.sides[0] && !!e.sides[1] &&
      Array.isArray(e.rounds) && e.rounds.every((r) => Array.isArray(r) && r.length === 2 && !!r[0] && !!r[1]);
  }

  /*
    Uma linha curta para o feed da mesa, para qualquer tipo de registro. Devolve '' se não reconhecer.
    Também serve para o resultado de rollFixa, rollExpr e rollTable (aí o tipo sai do formato).
  */
  function summary(e, full) {
    if (!e || typeof e !== 'object') return '';
    if (e.type === 'sep') return typeof e.text === 'string' ? e.text : '';
    const mode = e.mode || (Array.isArray(e.sides) ? 'duelo' : Array.isArray(e.terms) ? 'dados' : e.atributo != null ? 'fixa' : e.itemText != null ? 'tabela' : '');
    if (mode === 'fixa') return e.total + ' · ' + fixaComp(e.atributo, e.fixa, e.dieValue);
    if (mode === 'dados') return Array.isArray(e.terms) ? e.total + ' · ' + (e.expr || displayTerms(e.terms)) + ' → ' + rollsLine(e.terms, full) : '';
    if (mode === 'tabela') return (e.tableName ? e.tableName + ' → ' : '') + e.itemText + ' (' + e.itemIndex + ' de ' + e.itemCount + ')';
    if (mode === 'duelo' && hasRounds(e) && e.rounds.length) {
      const r = lastRound(e);
      return e.sides[0].name + ' ' + r[0].total + ' × ' + r[1].total + ' ' + e.sides[1].name + '. ' + duelSummary(e);
    }
    return '';
  }

  /* ================= os dados, um a um ================= */
  /*
    O que cada dado sorteou numa rolagem: [[lados, valor], …], na ordem em que saíram. É o que o auditor da mesa
    confere (quantas vezes saiu cada face). Aceita o resultado de rollFixa, rollExpr e rollTable e os registros do
    rolador (fixa, dados, duelo com todas as rodadas, tabela — o sorteio de um item é um dado de tantos lados quantos
    são os itens). Dado de um lado só, e fixa total, não sorteiam nada: ficam de fora. No máximo `max` dados (60).
  */
  function diceOf(e, max) {
    const out = [];
    const lim = Number.isSafeInteger(max) && max > 0 ? max : 60;
    const push = (sides, v) => {
      if (out.length < lim && Number.isSafeInteger(sides) && sides >= 2 && Number.isSafeInteger(v) && v >= 1 && v <= sides) out.push([sides, v]);
    };
    const terms = (ts) => { for (const t of Array.isArray(ts) ? ts : []) if (t && t.kind === 'dice' && Array.isArray(t.rolls)) for (const r of t.rolls) push(t.sides, r); };
    if (!e || typeof e !== 'object') return out;
    const mode = e.mode || (Array.isArray(e.sides) ? 'duelo' : Array.isArray(e.terms) ? 'dados' : e.atributo != null ? 'fixa' : e.itemIndex != null ? 'tabela' : '');
    if (mode === 'fixa') push(e.atributo - e.fixa, e.dieValue);
    else if (mode === 'dados') terms(e.terms);
    else if (mode === 'tabela') push(e.itemCount, e.itemIndex);
    else if (mode === 'duelo' && hasRounds(e)) {
      for (const r of e.rounds) r.forEach((x, i) => { const s = e.sides[i]; if (s.mode === 'fixa') push(s.atributo - s.fixa, x.dieValue); else terms(x.terms); });
    }
    return out;
  }

  /* ================= registros ================= */
  /*
    Montam a rolagem no formato que o rolador guarda. Antes de sortear, conferem tudo
    e recusam com um Error claro (mensagem em português) em vez de guardar um registro errado.
  */
  function textArg(v, max, what) {
    if (v == null) return '';
    if (typeof v !== 'string') throw new Error(what + ' precisa ser um texto.');
    return v.trim().slice(0, max);
  }

  /* meta = { title, description, color, createdAt? }: título e descrição entram aparados, como no formulário do rolador. */
  function metaArg(meta) {
    const m = meta == null ? {} : meta;
    if (typeof m !== 'object') throw new Error('Título, descrição e cor precisam vir num objeto.');
    const at = m.createdAt;
    if (at != null && !(typeof at === 'number' && Number.isFinite(at) && at > 0)) throw new Error('createdAt precisa ser a hora em milissegundos.');
    return { title: textArg(m.title, 120, 'O título'), description: textArg(m.description, 2000, 'A descrição'),
      color: typeof m.color === 'string' && COLOR[m.color] ? m.color : null, createdAt: at == null ? null : at };
  }

  function baseEntry(mode, m) {
    return { id: uid('r'), type: 'roll', mode, title: m.title, description: m.description,
      color: m.color, pinned: false, createdAt: m.createdAt == null ? Date.now() : m.createdAt };
  }

  /* Requisito: nada, { op, target } ou os valores crus de um formulário. */
  function checkArg(c) {
    if (!c) return { check: null };
    if (typeof c !== 'object') return { error: 'A comparação precisa vir como { op, target }.' };
    return readCheck(c.op, c.target);
  }

  /* Confere uma lista de partes (dados e números) pelas regras de parseDice e devolve o resultado dele. */
  function reparse(terms) {
    if (!Array.isArray(terms)) return null;
    for (const t of terms) {
      if (!t || typeof t !== 'object' || (t.sign !== 1 && t.sign !== -1)) return null;
      if (t.kind === 'dice') { if (!Number.isSafeInteger(t.count) || !Number.isSafeInteger(t.sides) || t.count < 0 || t.sides < 0) return null; }
      else if (t.kind === 'num') { if (!Number.isSafeInteger(t.value) || t.value < 0) return null; }
      else return null;
    }
    return parseDice(compactTerms(terms));
  }

  /* Lê { parsed } (o resultado de parseDice) ou { expr } (o texto) e confere os limites de novo. */
  function diceArg(spec) {
    let p;
    if (spec.parsed != null) {
      const q = spec.parsed;
      if (typeof q !== 'object') return { error: '“parsed” precisa ser o resultado de parseDice.' };
      if (q.error) return { error: String(q.error) };
      if (q.empty) return { error: NO_EXPR };
      p = reparse(q.terms);
      if (!p) return { error: '“parsed” precisa ser o resultado de parseDice.' };
    } else {
      if (spec.expr != null && typeof spec.expr !== 'string') return { error: '“expr” precisa ser um texto, como 2d6+3.' };
      p = parseDice(spec.expr);
    }
    return p.empty ? { error: NO_EXPR } : p;
  }

  function buildFixa(spec, meta) {
    const s = spec || {};
    const m = metaArg(meta);
    const v = validateFixa(s.atributo, s.fixa, '');
    if (!v.ok) throw new Error(capital(v.text));
    const c = checkArg(s.check);
    if (c.error) throw new Error(c.error);
    const base = baseEntry('fixa', m);
    const dieValue = v.die > 0 ? randInt(v.die) : 0;
    return Object.assign(base, { atributo: v.atributo, fixa: v.fixa, die: v.die, dieValue, total: dieValue + v.fixa, check: c.check });
  }

  function buildDados(spec, meta) {
    const s = spec || {};
    const m = metaArg(meta);
    const p = diceArg(s);
    if (p.error) throw new Error(p.error);
    const c = checkArg(s.check);
    if (c.error) throw new Error(c.error);
    const base = baseEntry('dados', m);
    const r = rollTerms(p.terms);
    return Object.assign(base, { expr: p.norm, terms: r.terms, total: r.total, min: p.min, max: p.max, check: c.check });
  }

  function buildTabela(spec, meta) {
    const t = spec && spec.table;
    const m = metaArg(meta);
    if (!t || typeof t !== 'object' || typeof t.id !== 'string' || !t.id || typeof t.name !== 'string' || !t.name.trim() ||
      (t.text != null && typeof t.text !== 'string')) throw new Error('A tabela precisa vir como { id, name, text }.');
    const items = tableItems(t);
    if (!items.length) throw new Error('A tabela “' + t.name + '” está vazia.');
    const base = baseEntry('tabela', m);
    const index = randInt(items.length);
    return Object.assign(base, { tableId: t.id, tableName: t.name, itemCount: items.length, itemIndex: index, itemText: items[index - 1] });
  }

  /* ================= duelo ================= */
  function rollSide(side) {
    if (side.mode === 'fixa') {
      const die = side.atributo - side.fixa;
      const dieValue = die > 0 ? randInt(die) : 0;
      return { total: dieValue + side.fixa, dieValue };
    }
    return rollTerms(side.terms);
  }

  /* Um lado do duelo, conferido; os erros saem com o nome do lado na frente ("Ataque: ..."). */
  function duelSide(s, i) {
    if (!s || typeof s !== 'object') throw new Error('Cada lado do duelo precisa vir como um objeto.');
    if (s.name != null && typeof s.name !== 'string') throw new Error('O nome do lado precisa ser um texto.');
    const name = (s.name || '').trim().slice(0, 40) || DEFAULT_SIDE_NAMES[i];
    const prefix = name + ': ';
    const mode = s.mode != null ? s.mode : (s.atributo != null ? 'fixa' : (s.expr != null || s.parsed != null) ? 'dados' : null);
    let side;
    if (mode === 'fixa') {
      const v = validateFixa(s.atributo, s.fixa, prefix);
      if (!v.ok) throw new Error(v.text);
      side = { name, mode: 'fixa', atributo: v.atributo, fixa: v.fixa };
    } else if (mode === 'dados') {
      const p = diceArg(s);
      if (p.error) throw new Error(prefix + lowerFirst(p.error));
      side = { name, mode: 'dados', expr: p.norm, terms: bareTerms(p.terms), min: p.min, max: p.max };
    } else throw new Error(prefix + 'diga se o lado rola fixa (atributo e fixa) ou dados (expr).');
    const c = checkArg(s.check);
    if (c.error) throw new Error(prefix + lowerFirst(c.error));
    side.check = c.check;
    return side;
  }

  function addRound(e) {
    const r = e.sides.map((s) => rollSide(s));
    e.rounds.push(r);
    if (r[0].total === r[1].total) { e.winner = null; e.decidedBy = null; }
    else { e.winner = r[0].total > r[1].total ? 0 : 1; e.decidedBy = 'rolagem'; }
  }

  /* sides = [lado, lado]; cada lado é { name, atributo, fixa, check } ou { name, expr | parsed, check }. Vence quem tirar mais. */
  function buildDuel(sides, meta) {
    const list = Array.isArray(sides) ? sides : sides && sides.sides;
    const m = metaArg(meta);
    if (!Array.isArray(list) || list.length !== 2) throw new Error('O duelo precisa de exatamente 2 lados.');
    const checked = list.map(duelSide);
    const e = Object.assign(baseEntry('duelo', m), { sides: checked, rounds: [], winner: null, decidedBy: null });
    addRound(e);
    return e;
  }

  /* Um lado já guardado ainda pode ser rolado pelas mesmas regras? */
  function storedSideOk(s) {
    if (!s || typeof s !== 'object') return false;
    if (s.mode === 'fixa') return Number.isSafeInteger(s.atributo) && Number.isSafeInteger(s.fixa) && s.atributo >= 1 && s.atributo <= MAX_NUM && s.fixa >= 0 && s.fixa <= s.atributo;
    if (s.mode !== 'dados') return false;
    const p = reparse(s.terms);
    return !!p && !p.error && !p.empty;
  }

  /* Desempate: rola os dois lados de novo, no próprio registro (que também é devolvido). */
  function addDuelRound(e) {
    if (!e || typeof e !== 'object' || e.mode !== 'duelo' || !hasRounds(e) || !e.sides.every(storedSideOk)) throw new Error('Essa rolagem não é um duelo que dê para rolar de novo.');
    if (e.winner != null) throw new Error('Esse duelo já tem vencedor: só dá para rolar de novo depois de um empate.');
    addRound(e);
    return e;
  }

  /* ================= comandos do chat ================= */
  const CMD = lookup({ r: 'dados', rolar: 'dados', roll: 'dados', fixa: 'fixa', f: 'fixa', me: 'me', ajuda: 'ajuda', help: 'ajuda', '?': 'ajuda' });

  const HELP = Object.freeze([
    { cmd: '/r <dados>', desc: 'Rola dados. Ex.: /r 2d6+3. Só o número de lados também vale: /r 20 rola 1d20. Também funciona com /rolar e /roll.' },
    { cmd: '/r <dados> <sinal> <alvo>', desc: 'Rola e diz se passou. Ex.: /r 1d20+5 >= 15. Sinais: >=, >, =, <= e <.' },
    { cmd: '/fixa <atributo> [fixa]', desc: 'Rola um atributo com fixa: um dado de (atributo − fixa) lados, mais a fixa. Ex.: /fixa 60 20. Sem a fixa, rola o atributo inteiro. Atalho: /f.' },
    { cmd: '/fixa <atributo> [fixa] <sinal> <alvo>', desc: 'Rola com fixa e diz se passou. Ex.: /fixa 60 20 >= 45.' },
    { cmd: '/me <ação>', desc: 'Conta uma ação do personagem. Ex.: /me saca a espada.' },
    { cmd: '/ajuda', desc: 'Mostra esta lista. Também funciona com /help e /?.' },
  ].map((x) => Object.freeze(x)));

  function erro(message) { return { type: 'erro', message }; }

  /* Separa "… >= 15" em parte principal e comparação. */
  function splitCheck(s) {
    const m = /[<>=≥≤]+/.exec(s);
    if (!m) return { left: s, check: null };
    const op = OP_ALIAS[m[0]];
    if (!op) return { error: 'Não entendi o sinal “' + clip(m[0]) + '”. ' + OP_HINT };
    const r = readSigned(s.slice(m.index + m[0].length));
    if (r.empty) return { error: 'Falta o alvo depois do “' + OPS[op].sym + '”.' };
    if (r.bad) return { error: 'O alvo só aceita número inteiro (sem letra, vírgula ou ponto).' };
    if (r.big) return { error: 'Esse alvo é grande demais.' };
    return { left: s.slice(0, m.index), check: { op, target: r.value } };
  }

  function cmdDados(name, rest) {
    const sp = splitCheck(rest);
    if (sp.error) return erro(sp.error);
    let expr = sp.left.trim();
    if (!expr) return erro('Falta o dado. Escreva algo como /' + name + ' 1d20 ou /' + name + ' 2d6+3 >= 10.');
    // mesmo tamanho do campo "Dados" do rolador; também segura o tamanho da mensagem de erro, que repete o texto
    if (expr.length > 120) return erro('Essa rolagem ficou comprida demais. Escreva algo como /' + name + ' 2d6+3.');
    if (/^\d+$/.test(expr)) expr = '1d' + expr; // só o número de lados: /r 20 é 1d20
    const p = parseDice(expr);
    if (p.error) return erro(p.error);
    return { type: 'dados', expr: p.norm, check: sp.check };
  }

  function cmdFixa(name, rest) {
    const uso = 'Escreva algo como /' + name + ' 60 20 ou /' + name + ' 60 20 >= 45.';
    const sp = splitCheck(rest);
    if (sp.error) return erro(sp.error);
    const parts = sp.left.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return erro('Digite o atributo e quanto quer fixar. ' + uso);
    if (parts.length > 2) return erro('O /' + name + ' só leva o atributo e a fixa. ' + uso);
    const v = validateFixa(parts[0], parts[1], '');
    if (!v.ok) return erro(capital(v.text));
    return { type: 'fixa', atributo: v.atributo, fixa: v.fixa, check: sp.check };
  }

  /*
    Lê uma linha do chat da mesa. Só interpreta; quem rola é rollExpr, rollFixa ou os build*.
    Devolve { type: 'chat' | 'dados' | 'fixa' | 'me' | 'ajuda' | 'erro', ... }.
  */
  function command(text) {
    const src = String(text == null ? '' : text).trim();
    if (src.charAt(0) !== '/') return { type: 'chat', text: src };
    const m = /^\/(\S*)\s*([\s\S]*)$/.exec(src);
    let name = fold(m[1]);
    let rest = m[2];
    if (!CMD[name]) {
      // comando colado no valor: /r2d6+3, /f60 20
      const glued = /^([a-z]+)([^a-z].*)$/i.exec(m[1]);
      if (glued && CMD[fold(glued[1])]) { name = fold(glued[1]); rest = (glued[2] + ' ' + rest).trim(); }
    }
    const kind = CMD[name];
    if (kind === 'dados') return cmdDados(name, rest);
    if (kind === 'fixa') return cmdFixa(name, rest);
    if (kind === 'me') return rest ? { type: 'me', text: rest } : erro('Falta dizer a ação. Escreva algo como /me saca a espada.');
    if (kind === 'ajuda') return { type: 'ajuda' };
    return erro('Não entendi o comando “/' + clip(m[1]) + '”. Escreva /ajuda para ver os comandos.');
  }

  /* ================= saída ================= */
  const api = Object.freeze({
    // sorteio
    randInt, uid,
    // dados livres
    tokenizeDice, parseDice, displayTerms, compactTerms, bareTerms, rollTerms, rollExpr,
    // fixa
    readInt, validateFixa, rollFixa,
    // tabela
    tableItems, rollTable,
    // comparação
    OPS, readSigned, readCheck, normCheck, evalCheck, checkReach, verdict,
    // textos
    fold, fixaComp, dadosComp, compText, duelSummary, summary,
    // os dados, um a um (para o auditor)
    diceOf,
    // registros
    buildFixa, buildDados, buildTabela, buildDuel, addDuelRound, rollSide,
    // chat
    command, HELP,
    // constantes
    COLORS, MAX_NUM,
  });

  const TC = (root.TC = root.TC || {});
  TC.dice = api;
  if (typeof module !== 'undefined' && module && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
