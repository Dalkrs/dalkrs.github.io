/* Tiny Cats · Mapa-múndi · as intrigas e os segredos (lote 11, parte 4): as contas, sem página e sem DOM.
   O modelo (mapa.intr, normalizado no núcleo): os segredos (o texto, de quem é — um personagem, uma casa, uma facção, um
   título, um tratado, uma região ou um lugar do mapa; sem dono, um segredo do mundo —, quem sabe — personagens e
   facções —, se os jogadores sabem, se é boato e se é falso, e a nota do mestre).
   Aqui: o dono de um segredo e o nome dele, as escolhas de dono de cada tipo (para o cartão), as facções ligadas a um
   segredo (para o filtro da aba) e a notícia para o rascunho do Jornal quando o mestre revela um segredo.
   Roda no navegador (window.MundoIntrigas) e no Node (testes). */
(() => {
  'use strict';
  const NN = () => (typeof window !== 'undefined' && window.MundoNucleo) || (typeof require === 'function' ? require('./nucleo.js') : null);
  const CC = () => (typeof window !== 'undefined' && window.MundoCorte) || (typeof require === 'function' ? require('./corte.js') : null);
  const DD = () => (typeof window !== 'undefined' && window.MundoDiplomacia) || (typeof require === 'function' ? require('./diplomacia.js') : null);
  const ehObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const VAZIA = { segredos: [] };
  const intrDe = m => (ehObj(m) && ehObj(m.intr) ? m.intr : VAZIA);
  const segredoDe = (m, id) => (id ? intrDe(m).segredos.find(s => s.id === id) || null : null);
  // os tipos de dono, na ordem do cartão
  const TIPOS_DONO = { p: 'Personagem', c: 'Casa', f: 'Facção', t: 'Título', tr: 'Tratado', r: 'Região', m: 'Lugar do mapa' };
  const facDe = (m, id) => (ehObj(m) && Array.isArray(m.faccoes) && id ? m.faccoes.find(f => f.id === id) || null : null);
  const objDe = (m, k, id) => (ehObj(m) && Array.isArray(m.objs) && id ? m.objs.find(o => o.k === k && o.id === id) || null : null);
  // o dono de um segredo (o personagem, a casa, a facção, o título, o tratado, a região ou o marcador); null sem ele
  function donoDe(m, de) {
    if (!ehObj(de)) return null;
    const C = CC();
    if (de.t === 'p') return C.pessoaDe(m, de.id);
    if (de.t === 'c') return C.casaDe(m, de.id);
    if (de.t === 'f') return facDe(m, de.id);
    if (de.t === 't') return C.tituloDe(m, de.id);
    if (de.t === 'tr') return DD().tratadoDe(m, de.id);
    return objDe(m, de.t, de.id);
  }
  // o nome do dono: o do personagem, o da casa, o da facção, o do título ("Reino de Aldar"), o do tratado ("Aliança:
  // Aldar, Ilhas"), o da região e o do lugar (o marcador sem nome: o do ícone); '' sem dono
  function nomeDoDono(m, de) {
    const x = donoDe(m, de);
    if (!x) return '';
    const N = NN(), nome = String(x.nome || '').trim();
    if (de.t === 't') return CC().nomeDoTitulo(m, x);
    if (de.t === 'tr') return DD().nomeDoTipo(m, x) + ': ' + x.partes.map(id => { const f = facDe(m, id); return f ? String(f.nome || '').trim() || 'Facção sem nome' : 'uma facção'; }).join(', ');
    if (de.t === 'm') return nome || (N.ICONES[x.ic] || N.ICONES.cidade).nome;
    return nome || (de.t === 'f' ? 'Facção sem nome' : de.t === 'r' ? 'Região sem nome' : de.t === 'c' ? 'Casa sem nome' : 'Sem nome');
  }
  // as escolhas de dono de um tipo, para o cartão: [[id, nome]] (os personagens em ordem alfabética; os outros, na ordem do mapa)
  function opcoesDeDono(m, t) {
    const C = CC(), par = x => [x.id, nomeDoDono(m, { t, id: x.id })];
    if (t === 'p') return C.corteDe(m).pessoas.map(par).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
    if (t === 'c') return C.corteDe(m).casas.map(par);
    if (t === 'f') return (ehObj(m) && Array.isArray(m.faccoes) ? m.faccoes : []).map(par);
    if (t === 't') return C.corteDe(m).titulos.map(par);
    if (t === 'tr') return DD().diplDe(m).tratados.map(par);
    if (t === 'r' || t === 'm') return (ehObj(m) && Array.isArray(m.objs) ? m.objs : []).filter(o => o.k === t).map(par);
    return [];
  }
  /* As facções ligadas a um segredo (para o filtro da aba): a do dono (a do personagem; as dos membros da casa; a própria
     facção; o reino do título; as partes do tratado; a dona da região e a do lugar) e as que sabem. → Set */
  function facsDoSegredo(m, s) {
    const N = NN(), C = CC(), out = new Set(s.sabem.f), x = donoDe(m, s.de), t = s.de && s.de.t;
    if (x && t === 'p') out.add(x.fac);
    if (x && t === 'c') for (const p of C.membrosDe(m, x.id)) out.add(p.fac);
    if (x && t === 'f') out.add(x.id);
    if (x && t === 't') out.add(x.fac);
    if (x && t === 'tr') for (const f of x.partes) out.add(f);
    if (x && t === 'r') out.add(N.facDaRegiao(m, x));
    if (x && t === 'm') { const r = N.regiaoEm(m, x.x, x.y); if (r) out.add(N.facDaRegiao(m, r)); }
    out.delete(null);
    return out;
  }
  /* A notícia para o rascunho do Jornal quando o mestre revela um segredo (ele revisa lá antes de publicar): o título diz
     se é boato e de quem é; o texto é o segredo. → { tit, txt } */
  function noticiaSegredo(m, s) {
    const dono = nomeDoDono(m, s.de);
    return { tit: (s.boato ? 'Um boato' : 'Um segredo revelado') + (dono ? ': ' + dono : ''), txt: s.txt };
  }

  const MundoIntrigas = { intrDe, segredoDe, TIPOS_DONO, donoDe, nomeDoDono, opcoesDeDono, facsDoSegredo, noticiaSegredo };
  if (typeof module === 'object' && module && module.exports) module.exports = MundoIntrigas;
  if (typeof window !== 'undefined') window.MundoIntrigas = MundoIntrigas;
})();
