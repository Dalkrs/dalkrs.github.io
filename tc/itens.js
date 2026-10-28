/* =======================================================================
   TC.itens — os itens da mesa (lote 29): o catálogo, as lojas e as receitas, sem DOM.

   Os documentos da mesa (a aba Itens, do mestre; o banco confere quem lê e escreve — SQL 0024):
     · itens:catalogo   — { v, itens: [item] } (só quem mestra);
     · itens:loja:<id>  — uma loja, ligada a um lugar do Mapa-múndi: { v, nome, nota, lugar: { mapa, marcador, nome },
                          aberta, itens: [{ id, item, preco, estoque }], aqui: [idDaFicha] } — a mesa lê (o jogador só a
                          vê de perto: aqui são os personagens que estão no hexágono do lugar, e é o banco que monta);
     · itens:rec:<id>   — uma receita: { v, nome, nota, ingredientes: [{ nome, t, qtd }], resultado: { item, qtd },
                          teste: null | { atr, dif }, falha: { perde, dano: [{ barra, val }], conds: [{ c, r }] } }
                          (a mesa lê: o jogador faz na bancada do Acampamento).
   O item (o mesmo da bolsa da ficha, ou um equipamento como os da ficha):
     { id, t: 'pocao' | 'bomba' | 'runa' | 'municao' | 'material' | 'equip', nome, nota, preco,
       fx: [efeitos da poção, como na bolsa], equip: { tipo, bonus: { FOR: n … }, def: { FOGO: n … } } }
   Entregar a uma ficha: os da bolsa somam no item de mesmo nome e tipo (ou entram novos, com a quantidade no estado);
   o equipamento entra nos itens da ficha, guardado. As contas daqui são as mesmas do banco (a compra) e das Cenas (o
   saque): a ficha nunca recebe um item pela metade.

     navegador   <script src="tc/itens.js"></script> (depois de tc/rules.js e tc/dice.js) → window.TC.itens
     Node        const I = require('./tc/itens.js')
   ======================================================================= */
(function (root) {
  'use strict';
  const R = () => (root.TC && root.TC.rules) || (typeof require === 'function' ? require('./rules.js') : null);
  const Dd = () => (root.TC && root.TC.dice) || (typeof require === 'function' ? require('./dice.js') : null);
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const txt = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max || 200);
  const longo = (v, max) => String(v == null ? '' : v).replace(/\r\n?/g, '\n').trim().slice(0, max || 2000);
  const num = (v, pad) => { const n = typeof v === 'string' ? (v.trim() === '' ? NaN : +v.replace(',', '.')) : +v; return isFinite(n) ? n : pad; };
  const inteiro = (v, lo, hi, pad) => Math.max(lo, Math.min(hi, Math.round(num(v, pad))));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const idOk = s => typeof s === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(s);
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  const CATALOGO = 'itens:catalogo', PRE_LOJA = 'itens:loja:', PRE_REC = 'itens:rec:', L_LOCAL = 'tinycats:itens:local';
  const TIPOS = [['pocao', 'Poção'], ['bomba', 'Bomba'], ['runa', 'Runa'], ['municao', 'Munição'], ['material', 'Material'], ['equip', 'Equipamento']];
  const DA_BOLSA = ['pocao', 'bomba', 'runa', 'municao', 'material'];
  const ATR_TESTE = [['FOR', 'Força'], ['DES', 'Destreza'], ['VIT', 'Vitalidade'], ['CAN', 'Canalização Mágica'], ['AGI', 'Agilidade'], ['PER', 'Percepção'], ['FUR', 'Furtividade']];
  const nomeDoTipo = t => (TIPOS.find(x => x[0] === t) || TIPOS[4])[1];
  const tipoOk = t => (TIPOS.some(x => x[0] === t) ? t : 'material');
  const MAX_ITENS = 400, MAX_LOJA = 120, MAX_ING = 12;

  /* ---------------- normalizar ---------------- */
  function numeros(o, chaves) {
    const out = {};
    if (!ehObj(o)) return out;
    for (const k of chaves) { const v = inteiro(o[k], -9999, 9999, 0); if (v) out[k] = v; }
    return out;
  }
  // o item do catálogo (e o que vai para a loja e para a receita), sempre neste formato
  function item(x) {
    x = ehObj(x) ? x : {};
    const t = tipoOk(x.t), Rr = R();
    const o = { id: idOk(x.id) ? x.id : uid(), t, nome: txt(x.nome, 80) || 'Item sem nome', nota: longo(x.nota, 600), preco: inteiro(x.preco, 0, 9999999, 0) };
    if (t === 'pocao') o.fx = Rr && Rr.efeitosDoItem ? Rr.efeitosDoItem({ fx: Array.isArray(x.fx) ? x.fx : [] }) : [];
    if (t === 'equip') {
      const e = ehObj(x.equip) ? x.equip : {};
      const tipos = Rr && Rr.tiposDeItem ? Rr.tiposDeItem(null).map(y => y.id) : [];
      o.equip = { tipo: typeof e.tipo === 'string' && (tipos.includes(e.tipo) || /^tp_[a-z0-9_-]{1,40}$/i.test(e.tipo)) ? e.tipo : '',
        bonus: numeros(e.bonus, Rr ? Rr.CHAVES_BONUS : []), def: numeros(e.def, Rr && Rr.DEFESAS_ESP ? Rr.DEFESAS_ESP.map(d => d.k) : []) };
    }
    return o;
  }
  const catalogo = d => ({ v: 1, itens: (ehObj(d) && Array.isArray(d.itens) ? d.itens : []).filter(ehObj).slice(0, MAX_ITENS).map(item) });
  const estoqueOk = v => (v == null || v === '' ? null : inteiro(v, 0, 999999, 0));
  function loja(d) {
    d = ehObj(d) ? d : {};
    const l = ehObj(d.lugar) ? d.lugar : {};
    return { v: 1, nome: txt(d.nome, 60) || 'Loja', nota: longo(d.nota, 600),
      lugar: idOk(l.mapa) && idOk(l.marcador) ? { mapa: l.mapa, marcador: l.marcador, nome: txt(l.nome, 80) } : null,
      aberta: d.aberta !== false,
      itens: (Array.isArray(d.itens) ? d.itens : []).filter(ehObj).slice(0, MAX_LOJA).map(x => ({ id: idOk(x.id) ? x.id : uid(), cat: idOk(x.cat) ? x.cat : null, item: item(x.item), preco: inteiro(x.preco, 0, 9999999, 0), estoque: estoqueOk(x.estoque) })),
      aqui: (Array.isArray(d.aqui) ? d.aqui : []).filter(x => typeof x === 'string' && x).slice(0, 60) };
  }
  function receita(d) {
    d = ehObj(d) ? d : {};
    const f = ehObj(d.falha) ? d.falha : {}, te = ehObj(d.teste) ? d.teste : null, r = ehObj(d.resultado) ? d.resultado : {};
    return { v: 1, nome: txt(d.nome, 80) || 'Receita', nota: longo(d.nota, 800),
      ingredientes: (Array.isArray(d.ingredientes) ? d.ingredientes : []).filter(ehObj).slice(0, MAX_ING).map(x => ({ nome: txt(x.nome, 80) || 'Ingrediente', t: tipoOk(x.t), qtd: inteiro(x.qtd, 1, 999, 1) })),
      resultado: { item: item(r.item), qtd: inteiro(r.qtd, 1, 999, 1) },
      teste: te && ATR_TESTE.some(a => a[0] === te.atr) ? { atr: te.atr, dif: inteiro(te.dif, 1, 999, 10) } : null,
      falha: { perde: f.perde !== false,
        dano: (Array.isArray(f.dano) ? f.dano : []).filter(ehObj).slice(0, 4).map(x => ({ barra: txt(x.barra, 30) || 'HP', val: txt(x.val, 30) })).filter(x => x.val),
        conds: (Array.isArray(f.conds) ? f.conds : []).filter(ehObj).slice(0, 6).map(x => ({ c: txt(x.c, 40), r: inteiro(x.r, 0, 99, 0) })).filter(x => x.c) },
      oculta: d.oculta === true };
  }

  /* ---------------- a ficha recebe ---------------- */
  /* A barra de um efeito, na ficha de quem recebe: o catálogo diz a barra pelo nome ("HP"); a bolsa da ficha guarda o
     id do recurso (ou "pd:" + o id da barra especial). Sem barra com esse nome, fica o nome (a poção avisa que falta). */
  function recDaFicha(ficha, rec) {
    const r = String(rec == null ? '' : rec);
    if (!ehObj(ficha) || !r) return r;
    const recs = Array.isArray(ficha.recursos) ? ficha.recursos : [], pds = Array.isArray(ficha.poderes) ? ficha.poderes : [];
    if (recs.some(x => ehObj(x) && x.id === r) || (r.startsWith('pd:') && pds.some(x => ehObj(x) && 'pd:' + x.id === r))) return r;
    const a = recs.find(x => ehObj(x) && x.id != null && norm(x.nome) === norm(r)); if (a) return String(a.id);
    const b = pds.find(x => ehObj(x) && x.id != null && norm(x.nome) === norm(r)); if (b) return 'pd:' + b.id;
    return r;
  }
  const fxParaFicha = (fx, ficha) => (Array.isArray(fx) ? fx : []).map(e => (ehObj(e) && (e.k === 'barra' || e.k === 'sob') ? Object.assign({}, e, { rec: recDaFicha(ficha, e.rec) }) : Object.assign({}, e)));
  // o item como entra na bolsa (o id é novo; a quantidade fica no estado) ou nos equipamentos (guardado)
  function paraBolsa(it, id, ficha) {
    const o = { id: id || 'b' + uid(), t: DA_BOLSA.includes(it.t) ? it.t : 'material', nome: it.nome };
    if (it.nota) o.nota = it.nota;
    if (o.t === 'pocao') o.fx = fxParaFicha(it.fx, ficha);
    return o;
  }
  function paraFicha(it, id) {
    const Rr = R(), b = {};
    for (const k of (Rr ? Rr.CHAVES_BONUS : [])) b[k] = 0;
    const e = it.equip || { bonus: {}, def: {} };
    Object.assign(b, e.bonus || {});
    const o = { id: id || uid(), nome: it.nome, equipado: false, bonus: b };
    if (e.tipo) o.tipo = e.tipo;
    if (e.def && Object.keys(e.def).length) o.def = Object.assign({}, e.def);
    if (it.nota) o.efeito = it.nota;
    return o;
  }
  const tipoNaBolsa = x => (DA_BOLSA.includes(x && x.t) ? x.t : 'material');
  /* Entregar: lista [{ item, qtd }] e os lapros → { ficha, estado, desfazer: { somou: { id: n }, novosB: [id], novosI: [id], lapros } }
     (a ficha e o estado novos; o que entrou, para o Desfazer tirar só isso depois). */
  function entregar(ficha, estado, lista, lapros) {
    const f0 = ehObj(ficha) ? ficha : {}, e0 = ehObj(estado) ? estado : {};
    const bolsa = Array.isArray(f0.bolsa) ? f0.bolsa.slice() : [], equip = Array.isArray(f0.itens) ? f0.itens.slice() : [], qtd = Object.assign({}, e0.qtd || {});
    const somou = {}, novosB = [], novosI = [];
    for (const x of lista || []) {
      const it = item(x.item), q = inteiro(x.qtd, 1, 9999, 1);
      if (it.t === 'equip') { for (let i = 0; i < Math.min(q, 20); i++) { const n = paraFicha(it); equip.push(n); novosI.push(n.id); } continue; }
      let b = bolsa.find(y => ehObj(y) && y.id != null && tipoNaBolsa(y) === it.t && norm(y.nome) === norm(it.nome));
      if (!b) { b = paraBolsa(it, null, f0); bolsa.push(b); novosB.push(String(b.id)); }
      const id = String(b.id);
      qtd[id] = Math.max(0, Math.floor(num(qtd[id], 0))) + q;
      somou[id] = (somou[id] || 0) + q;
    }
    const lp = Math.max(0, Math.round(num(lapros, 0))), lap0 = Math.max(0, Math.round(num(e0.lapros, 0)));
    const est = Object.assign({}, e0, { qtd });
    if (lp) est.lapros = lap0 + lp;
    return { ficha: Object.assign({}, f0, { bolsa, itens: equip }), estado: est, desfazer: { somou, novosB, novosI, lapros: lp } };
  }
  // o Desfazer de entregar, na ficha como ela está agora (o resto fica)
  function desentregar(ficha, estado, d) {
    const f0 = ehObj(ficha) ? ficha : {}, e0 = ehObj(estado) ? estado : {}, q1 = Object.assign({}, e0.qtd || {});
    for (const id in d.somou || {}) { const v = Math.max(0, Math.floor(num(q1[id], 0)) - d.somou[id]); if (v > 0 || !(d.novosB || []).includes(id)) q1[id] = v; else delete q1[id]; }
    const bolsa = (Array.isArray(f0.bolsa) ? f0.bolsa : []).filter(x => !(ehObj(x) && (d.novosB || []).includes(String(x.id)) && !(q1[String(x.id)] > 0)));
    const itens = (Array.isArray(f0.itens) ? f0.itens : []).filter(x => !(ehObj(x) && (d.novosI || []).includes(x.id)));
    const est = Object.assign({}, e0, { qtd: q1 });
    if (d.lapros) est.lapros = Math.max(0, Math.round(num(e0.lapros, 0)) - d.lapros);
    return { ficha: Object.assign({}, f0, { bolsa, itens }), estado: est };
  }

  /* ---------------- a loja ---------------- */
  const lapros = estado => Math.max(0, Math.round(num(ehObj(estado) ? estado.lapros : 0, 0)));
  // dá para comprar? → { ok, total, erro }
  function podeComprar(lj, idItem, qtd, estado) {
    const L = loja(lj), x = L.itens.find(y => y.id === idItem), q = inteiro(qtd, 1, 999, 1);
    if (!L.aberta) return { ok: false, erro: 'A loja está fechada.' };
    if (!x) return { ok: false, erro: 'Este item não está mais na loja.' };
    if (x.estoque != null && x.estoque < q) return { ok: false, erro: x.estoque ? 'Só há ' + x.estoque + ' na loja.' : 'Acabou o estoque.' };
    const total = x.preco * q, tem = lapros(estado);
    if (total > tem) return { ok: false, total, erro: 'Faltam ' + (total - tem) + ' lapros (custa ' + total + ', tem ' + tem + ').' };
    return { ok: true, total, item: x.item, preco: x.preco, qtd: q };
  }

  /* ---------------- a receita ---------------- */
  // o que a bolsa tem de cada ingrediente (pelo nome e pelo tipo) → [{ nome, t, precisa, tem, id }]
  function ingredientes(rc, ficha, estado) {
    const r = receita(rc), b = Array.isArray(ehObj(ficha) && ficha.bolsa) ? ficha.bolsa : [], q = ehObj(estado) && ehObj(estado.qtd) ? estado.qtd : {};
    return r.ingredientes.map(g => {
      const its = b.filter(y => ehObj(y) && y.id != null && norm(y.nome) === norm(g.nome) && (g.t === 'equip' || tipoNaBolsa(y) === g.t || g.t === 'material'));
      const tem = its.reduce((s, y) => s + Math.max(0, Math.floor(num(q[String(y.id)], 0))), 0);
      return { nome: g.nome, t: g.t, precisa: g.qtd, tem, ids: its.map(y => String(y.id)) };
    });
  }
  const podeFazer = (rc, ficha, estado) => { const l = ingredientes(rc, ficha, estado); return { ok: l.every(x => x.tem >= x.precisa), lista: l, faltam: l.filter(x => x.tem < x.precisa) }; };
  // tira os ingredientes da bolsa (o que acaba fica com 0, como a bolsa faz) → { estado, tirou: { id: n } }
  function gastar(rc, ficha, estado) {
    const q = Object.assign({}, ehObj(estado) && estado.qtd || {}), tirou = {};
    for (const g of ingredientes(rc, ficha, estado)) {
      let falta = g.precisa;
      for (const id of g.ids) { if (!falta) break; const v = Math.max(0, Math.floor(num(q[id], 0))), t = Math.min(v, falta); if (t) { q[id] = v - t; tirou[id] = (tirou[id] || 0) + t; falta -= t; } }
    }
    return { estado: Object.assign({}, estado || {}, { qtd: q }), tirou };
  }
  /* Fazer a receita (depois do teste, se há): sucesso → gasta e entrega o resultado; falha → gasta (se a receita diz
     que a falha perde os ingredientes) e devolve o que mais a falha faz (o dano e as condições, para quem aplica).
     → { ok, sucesso, ficha, estado, dano: [{ barra, val }], conds: [{ c, r }], desfazer } ou { ok: false, erro } */
  function fazer(rc, ficha, estado, sucesso) {
    const r = receita(rc), p = podeFazer(r, ficha, estado);
    if (!p.ok) return { ok: false, erro: 'Faltam: ' + p.faltam.map(x => (x.precisa - x.tem) + ' × ' + x.nome).join(', ') + '.' };
    if (sucesso) {
      const g = gastar(r, ficha, estado), e = entregar(ficha, g.estado, [{ item: r.resultado.item, qtd: r.resultado.qtd }], 0);
      return { ok: true, sucesso: true, ficha: e.ficha, estado: e.estado, dano: [], conds: [], desfazer: { tirou: g.tirou, ent: e.desfazer } };
    }
    const g = r.falha.perde ? gastar(r, ficha, estado) : { estado, tirou: {} };
    return { ok: true, sucesso: false, ficha, estado: g.estado, dano: r.falha.dano, conds: r.falha.conds, desfazer: { tirou: g.tirou, ent: null } };
  }
  // o Desfazer de fazer: devolve os ingredientes e tira o resultado (na ficha de agora)
  function desfazer(ficha, estado, d) {
    let f = ficha, e = estado;
    if (d && d.ent) { const x = desentregar(f, e, d.ent); f = x.ficha; e = x.estado; }
    const q = Object.assign({}, ehObj(e) && e.qtd || {});
    for (const id in (d && d.tirou) || {}) q[id] = Math.max(0, Math.floor(num(q[id], 0))) + d.tirou[id];
    return { ficha: f, estado: Object.assign({}, e || {}, { qtd: q }) };
  }
  // o teste da receita: 1 dado do atributo (a regra da fixa da ficha) contra a dificuldade → { sucesso, total, texto }
  function testar(rc, valorAtr, fixa, rng) {
    const r = receita(rc);
    if (!r.teste) return { sucesso: true, total: null, texto: 'Sem teste.' };
    const D = Dd(), v = Math.max(0, Math.round(num(valorAtr, 0)));
    let res = null;
    if (D && D.rollFixaMais && !rng) res = D.rollFixaMais(v, fixa || 0);
    if (!res || !res.ok) { const f = Math.min(Math.max(0, Math.round(num(fixa, 0))), v), lados = v - f, d = lados > 0 ? 1 + Math.floor((rng || Math.random)() * lados) : 0; res = { ok: true, total: d + f, d, fixa: f }; }
    const nome = (ATR_TESTE.find(a => a[0] === r.teste.atr) || ATR_TESTE[0])[1];
    return { sucesso: res.total >= r.teste.dif, total: res.total, texto: nome + ' ' + res.total + (res.total >= r.teste.dif ? ' ≥ ' : ' < ') + r.teste.dif };
  }

  // o texto curto de um item ("Poção · 30 lapros")
  const resumo = it => nomeDoTipo(it.t) + (it.preco ? ' · ' + it.preco + ' lapros' : '');

  const api = { CATALOGO, PRE_LOJA, PRE_REC, L_LOCAL, TIPOS, DA_BOLSA, ATR_TESTE, nomeDoTipo, item, catalogo, loja, receita, paraBolsa, paraFicha, entregar, desentregar,
    lapros, podeComprar, recDaFicha, fxParaFicha, ingredientes, podeFazer, gastar, fazer, desfazer, testar, resumo, uid, idOk, norm };
  root.TC = root.TC || {};
  root.TC.itens = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
