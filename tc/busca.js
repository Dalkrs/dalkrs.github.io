/* Tiny Cats · a busca rápida (lote 7, parte 6): acha pelo nome o que a pessoa pode abrir — as fichas e os NPCs, as
   cenas, o que tem nome no Mapa-múndi (marcadores, regiões, grupos, eventos, textos… e as facções), as receitas da
   Meditação, os itens das fichas e as matérias do Jornal — e diz para onde ir (a aba e o alvo, que a casca entrega ao
   sistema).
   Não lê nada sozinho: quem chama passa o que este aparelho tem (as linhas dos personagens e os documentos da mesa,
   ou, sem mesa, o que cada sistema guardou no navegador — ver fonteLocal) e o que a pessoa mestra. Nada escondido
   entra: o jogador recebe do banco só o que pode ler, e aqui ainda fica de fora o que só quem mestra abre (as cenas, o
   mapa inteiro, as receitas, o rascunho do Jornal). */
(function (raiz) {
  'use strict';
  const GRUPOS = [['ficha', 'Fichas e NPCs'], ['cena', 'Cenas'], ['mundo', 'Mapa-múndi'], ['receita', 'Receitas'], ['item', 'Itens'], ['jornal', 'Jornal']];
  const ORDEM = Object.fromEntries(GRUPOS.map(([k], i) => [k, i]));
  // o que tem nome no Mapa-múndi (os carimbos também, quando o mestre dá nome a um)
  const TIPO_MUNDO = { m: 'Marcador', g: 'Grupo', r: 'Região', e: 'Evento', z: 'Zona', f: 'Frente', t: 'Rota', l: 'Linha', x: 'Texto', c: 'Carimbo' };
  const MAX_ITENS = 6000;
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const txt = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max || 120) : '');
  // sem acento e sem maiúscula: "Dáin" acha "dain"
  const semAcento = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const aspas = s => '“' + s + '”';
  /* fonte = {
       personagens: [{ id, nome, dono_id, campanha, ficha }]   — as linhas que este aparelho tem
       doc(id) → os dados do documento, ou null · docIds: os ids dos documentos que este aparelho tem
       eu: o id de quem busca · nomes: { [id de usuário]: nome } (os participantes, para "Personagem de Ana")
       mestra: { cenas, mundo, meditacao, jornal } — o que quem busca mestra, aba por aba
       vista: a campanha em vista (id) ou null · campanhas: [{ id, nome }] · campsDoc(id) → as campanhas do documento
       semMesa: tudo deste navegador (cada um é o próprio mestre; as fichas não têm dono)
     } → [{ tipo, grupo, nome, sub, aba, alvo, k, ks, outra }]
     outra: o nome da campanha de uma cena ou de um mapa que não está em vista (para abrir, a pessoa troca de campanha) */
  function indexar(fonte) {
    const f = ehObj(fonte) ? fonte : {}, out = [], ms = ehObj(f.mestra) ? f.mestra : {};
    const doc = typeof f.doc === 'function' ? f.doc : () => null, ids = Array.isArray(f.docIds) ? f.docIds : [];
    const campsDoc = typeof f.campsDoc === 'function' ? f.campsDoc : () => [];
    const camps = Array.isArray(f.campanhas) ? f.campanhas : [], vista = typeof f.vista === 'string' && f.vista ? f.vista : null;
    const nomeCamp = id => { const c = camps.find(x => x && x.id === id); return c ? txt(c.nome) || 'Campanha' : 'outra campanha'; };
    // a campanha que não está em vista: o nome dela (do mundo, ou da campanha em vista: '')
    const fora = cs => { const l = (Array.isArray(cs) ? cs : cs ? [cs] : []).filter(x => typeof x === 'string' && x); return vista && l.length && !l.includes(vista) ? nomeCamp(l[0]) : ''; };
    const por = (tipo, nome, sub, aba, alvo, outra) => {
      if (out.length >= MAX_ITENS || !nome) return;
      const it = { tipo, grupo: GRUPOS[ORDEM[tipo]][1], nome, sub, aba, alvo, k: semAcento(nome), ks: semAcento(sub) };
      if (outra) it.outra = outra;
      out.push(it);
    };
    // as fichas e os NPCs, e os itens de cada um
    const linhas = (Array.isArray(f.personagens) ? f.personagens : []).filter(l => ehObj(l) && !l.apagado && typeof l.id === 'string' && l.id);
    const nomes = ehObj(f.nomes) ? f.nomes : {};
    for (const l of linhas) {
      const nome = txt(l.nome) || 'Sem nome', ficha = ehObj(l.ficha) ? l.ficha : {}, de = fora(l.campanha);
      const quem = f.semMesa ? 'Ficha' : ficha.petDe ? 'Pet' : f.eu && l.dono_id === f.eu ? 'Seu personagem'
        : l.dono_id ? (txt(nomes[l.dono_id], 40) ? 'Personagem de ' + txt(nomes[l.dono_id], 40) : 'Personagem de jogador') : 'NPC';
      por('ficha', nome, quem + (de ? ' · ' + de : ''), 'fichas', { pc: l.id });
      for (const it of Array.isArray(ficha.itens) ? ficha.itens : []) if (ehObj(it) && it.id != null && it.id !== '') por('item', txt(it.nome), 'Item de ' + nome, 'fichas', { pc: l.id, item: String(it.id) });
      for (const it of Array.isArray(ficha.bolsa) ? ficha.bolsa : []) if (ehObj(it) && it.id != null && it.id !== '') por('item', txt(it.nome), 'Na bolsa de ' + nome, 'fichas', { pc: l.id, bolsa: String(it.id) });
    }
    // as cenas (só quem mestra as Cenas as abre pelo nome), na ordem da lista, com a família ou a pasta
    if (ms.cenas) {
      const idx = doc('cenas:indice'), ordem = ehObj(idx) && Array.isArray(idx.ordem) ? idx.ordem : [];
      const pastas = ehObj(idx) && ehObj(idx.pastas) ? idx.pastas : {}, mae = ehObj(pastas.mae) ? pastas.mae : {}, de = ehObj(pastas.de) ? pastas.de : {};
      const lista = Array.isArray(pastas.lista) ? pastas.lista : [], cenas = new Map();
      for (const id of ids) {
        const m = /^cena:([A-Za-z0-9_-]{1,60}):m$/.exec(typeof id === 'string' ? id : ''), d = m && m[1] !== 'pub' ? doc(id) : null;
        if (ehObj(d)) cenas.set(m[1], txt(d.name) || 'Cena');
      }
      const pos = id => { const i = ordem.indexOf(id); return i < 0 ? 1e9 : i; };
      for (const id of [...cenas.keys()].sort((a, b) => pos(a) - pos(b))) {
        const mid = typeof mae[id] === 'string' ? mae[id] : null, pasta = lista.find(p => ehObj(p) && p.id === de[id]);
        const sub = mid && cenas.has(mid) ? 'Cena dentro de ' + aspas(cenas.get(mid)) : pasta && txt(pasta.nome) ? 'Cena · pasta ' + aspas(txt(pasta.nome)) : 'Cena';
        por('cena', cenas.get(id), sub, 'cenas', { cena: id }, fora(campsDoc('cena:' + id + ':m')));
      }
    }
    // o Mapa-múndi: quem mestra, os mapas inteiros; quem joga, o que os jogadores veem
    const pre = ms.mundo ? 'mundo:mapa:' : 'mundo:pub:';
    for (const id of ids) {
      if (typeof id !== 'string' || !id.startsWith(pre)) continue;
      const mid = id.slice(pre.length), m = doc(id);
      if (!ehObj(m) || !/^[A-Za-z0-9_.:-]{1,80}$/.test(mid)) continue;
      const nomeMapa = txt(m.nome) || 'Mapa', outra = ms.mundo ? fora(campsDoc(id)) : '';
      por('mundo', nomeMapa, 'Mapa', 'mundo', { mapa: mid }, outra);
      for (const o of Array.isArray(m.objs) ? m.objs : []) {
        if (!ehObj(o) || !TIPO_MUNDO[o.k] || typeof o.id !== 'string' || (!ms.mundo && o.oculto)) continue;
        por('mundo', txt(o.nome), TIPO_MUNDO[o.k] + ' · ' + nomeMapa, 'mundo', { mapa: mid, obj: o.id }, outra);
      }
      for (const fc of Array.isArray(m.faccoes) ? m.faccoes : []) {
        if (!ehObj(fc) || typeof fc.id !== 'string' || (!ms.mundo && fc.oculta)) continue;
        por('mundo', txt(fc.nome), 'Facção · ' + nomeMapa, 'mundo', { mapa: mid, fac: fc.id }, outra);
      }
    }
    // as receitas: quem mestra a Meditação, todas; quem joga, as que os personagens dele descobriram
    if (ms.meditacao) {
      const r = doc('medit:receitas');
      for (const x of ehObj(r) && Array.isArray(r.lista) ? r.lista : []) if (ehObj(x) && typeof x.id === 'string') por('receita', txt(x.nome) || 'Receita sem nome', 'Receita da Meditação', 'meditacao', { receita: x.id });
    } else if (f.eu) {
      for (const l of linhas.filter(x => x.dono_id === f.eu)) {
        const a = doc('medit:achados:' + l.id);
        for (const x of ehObj(a) && Array.isArray(a.achadas) ? a.achadas : []) if (ehObj(x) && typeof x.id === 'string') por('receita', txt(x.nome) || 'Receita', 'Descoberta por ' + (txt(l.nome) || 'um personagem seu'), 'meditacao', { achado: x.id, pc: l.id });
      }
    }
    // o Jornal: as matérias publicadas (e, para quem mestra, as do rascunho que ainda não saíram)
    const pub = doc('jornal:pub'), vistas = new Set();
    for (const x of ehObj(pub) && Array.isArray(pub.materias) ? pub.materias : []) if (ehObj(x) && typeof x.id === 'string') { vistas.add(x.id); por('jornal', txt(x.tit) || 'Matéria sem título', 'Matéria do Jornal', 'jornal', { materia: x.id }); }
    if (ms.jornal) {
      const ras = doc('jornal:rascunho');
      for (const x of ehObj(ras) && Array.isArray(ras.materias) ? ras.materias : []) if (ehObj(x) && typeof x.id === 'string' && !vistas.has(x.id)) por('jornal', txt(x.tit) || 'Matéria sem título', 'No rascunho do Jornal', 'jornal', { materia: x.id, rascunho: true });
    }
    return out;
  }
  /* Sem mesa: o que cada sistema guardou neste navegador, no mesmo formato da mesa (ler(chave) → o texto guardado).
     Cada um é o próprio mestre: vê tudo o que é dele. */
  function fonteLocal(ler) {
    const json = k => { try { const v = JSON.parse((typeof ler === 'function' ? ler(k) : null) || 'null'); return v && typeof v === 'object' ? v : null; } catch (e) { return null; } };
    const docs = new Map();
    const fx = json('urgm_calc_atributos_v1');
    const personagens = (fx && Array.isArray(fx.personagens) ? fx.personagens : []).filter(p => ehObj(p) && typeof p.id === 'string' && p.id).map(p => ({ id: p.id, nome: p.nome, ficha: p }));
    const cl = json('tinycats:cenas:lista');
    for (const c of Array.isArray(cl) ? cl : []) if (ehObj(c) && typeof c.id === 'string') docs.set('cena:' + c.id + ':m', { name: c.nome });
    const mu = json('tinycats:mundo:v1');
    for (const [id, m] of Object.entries(mu && ehObj(mu.mapas) ? mu.mapas : {})) docs.set('mundo:mapa:' + id, m);
    for (const [k, d] of [['jornal:pub', json('tinycats:jornal:pub')], ['jornal:rascunho', json('tinycats:jornal:rascunho')]]) if (d) docs.set(k, d);
    const md = json('tinycats:meditacao:local');
    if (md && ehObj(md['medit:receitas'])) docs.set('medit:receitas', md['medit:receitas']);
    return { personagens, doc: id => docs.get(id) || null, docIds: [...docs.keys()], eu: null, semMesa: true, mestra: { cenas: true, mundo: true, meditacao: true, jornal: true } };
  }
  /* A busca: todas as palavras precisam aparecer (no nome ou na linha de baixo). Antes, o nome que começa com a
     primeira palavra; depois, uma palavra do nome que começa com ela; depois, o nome que a contém; por fim, só a linha
     de baixo. No empate, o que está na campanha em vista, a ordem dos grupos e o nome. */
  function buscar(indice, consulta, max) {
    const ps = semAcento(consulta).split(/\s+/).filter(Boolean);
    if (!ps.length) return [];
    const p0 = ps[0], out = [];
    for (const it of Array.isArray(indice) ? indice : []) {
      if (!ps.every(p => it.k.includes(p) || it.ks.includes(p))) continue;
      const nota = it.k.startsWith(p0) ? 0 : it.k.split(/[^a-z0-9]+/).some(w => w.startsWith(p0)) ? 1 : it.k.includes(p0) ? 2 : 3;
      out.push([nota, it]);
    }
    out.sort((a, b) => a[0] - b[0] || (a[1].outra ? 1 : 0) - (b[1].outra ? 1 : 0) || ORDEM[a[1].tipo] - ORDEM[b[1].tipo] || a[1].k.localeCompare(b[1].k));
    return out.slice(0, max || 40).map(x => x[1]);
  }
  const API = { GRUPOS, TIPO_MUNDO, indexar, fonteLocal, buscar, semAcento };
  if (typeof module === 'object' && module.exports) module.exports = API;
  else (raiz.TC = raiz.TC || {}).busca = API;
})(typeof window !== 'undefined' ? window : globalThis);
