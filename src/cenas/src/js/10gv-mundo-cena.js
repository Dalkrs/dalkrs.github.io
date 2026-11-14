/* ---------------------------------------------------------------
   10gv. O MUNDO EMPRESTA PARA A CENA (lote 155) — o que o Mapa-múndi manda junto com o "Gerar a cena aqui" e o "Gerar
   este lugar…", além do chão, do rio, da estação, do clima, da hora e dos eventos (que já vinham):
     · o reino dono da região (quem a controla, e quem é o dono, se ela está ocupada): as cores vão para os estandartes,
       os brasões e as cortinas da cena; os guardas levam o nome do reino; a nota diz de quem é a terra;
     · o que está por perto: os lugares marcados até 3 hexágonos dali, com a direção e a distância (o boato e o falso
       vão marcados), numa nota só do mestre;
     · os eventos de hoje, na mesma nota.
   O bloco "Do mundo", na janela, mostra o que veio e tem as chaves para usar ou não. Depois de criar, a nota "Do mundo"
   fica escondida no mapa.
   --------------------------------------------------------------- */
const MundoCena = (() => {
  const cor = v => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null);
  const txt = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n || 60) : '');
  function valida(pre) {
    if (!pre || typeof pre !== 'object') return null;
    const out = {};
    const r = pre.reino;
    if (r && typeof r === 'object') {
      const cs = Array.isArray(r.cores) ? r.cores.map(cor) : [];
      const reino = { nome: txt(r.nome), regiao: txt(r.regiao), ocupada: txt(r.ocupada), cores: cs[0] && cs[1] ? [cs[0], cs[1]] : null };
      if (reino.nome || reino.regiao) out.reino = reino;
    }
    if (Array.isArray(pre.perto)) {
      const l = pre.perto.filter(x => x && typeof x === 'object' && txt(x.nome)).slice(0, 6).map(x => ({ nome: txt(x.nome), tipo: txt(x.tipo, 30), d: Math.max(0, Math.min(9, Math.round(Number(x.d) || 0))), dir: txt(x.dir, 20), boato: !!x.boato, falso: !!x.falso, oculto: !!x.oculto }));
      if (l.length) out.perto = l;
    }
    if (Array.isArray(pre.eventos)) { const e = pre.eventos.filter(x => typeof x === 'string').map(x => txt(x)).filter(Boolean).slice(0, 6); if (e.length) out.eventos = e; }
    return out.reino || out.perto || out.eventos ? out : null;
  }
  const prefs = () => ({ reino: App.opt.mundoReino !== false, perto: App.opt.mundoPerto !== false });
  const linhaPerto = x => `${x.nome}${x.tipo && x.tipo.toLowerCase() !== x.nome.toLowerCase() ? ' (' + x.tipo.toLowerCase() + ')' : ''}, ${x.d === 0 ? 'aqui mesmo' : (x.d === 1 ? 'a 1 hexágono' : 'a ' + x.d + ' hexágonos') + ' ' + x.dir}${x.falso ? ' — é falso' : x.boato ? ' — é boato' : ''}${x.oculto ? ' (os jogadores não sabem)' : ''}`;
  function nota(info, o) {
    const out = [];
    if (o.reino && info.reino) {
      const r = info.reino;
      out.push(r.nome ? `Terra de ${r.nome}${r.regiao ? ' (' + r.regiao + ')' : ''}.` : `Região: ${r.regiao}.`);
      if (r.ocupada) out.push(`Ocupada: a dona é ${r.ocupada}.`);
    }
    if (o.perto && info.perto) out.push('Por perto: ' + info.perto.map(linhaPerto).join('; ') + '.');
    if (info.eventos) out.push('Hoje: ' + info.eventos.join(', ') + '.');
    return out.join(' ');
  }
  // o bloco da janela
  function controles(info, K, mudou) {
    const o = prefs(), set = (k, v) => { App.opt[k] = v; mudou(); };
    return h('div', { class: 'ger-mundo', id: 'ger-mundo' },
      info.reino ? K.toggle('ger-mundo-reino', o.reino, v => set('mundoReino', v), info.reino.nome ? `O reino: ${info.reino.nome} (as cores e o nome nos guardas)` : `A região: ${info.reino.regiao}`) : null,
      info.reino && info.reino.cores ? h('div', { class: 'ger-mundo-cores' }, info.reino.cores.map(c2 => h('span', { class: 'ger-mundo-cor', style: { background: c2 } }))) : null,
      info.perto ? K.toggle('ger-mundo-perto', o.perto, v => set('mundoPerto', v), `O que está por perto (${info.perto.length})`) : null,
      info.perto && o.perto ? h('ul', { class: 'ger-mundo-l' }, info.perto.map(x => h('li', { text: linhaPerto(x) }))) : null,
      info.eventos ? K.note('Hoje: ' + info.eventos.join(', ') + ' (o clima, a hora e os efeitos já vêm nas escolhas).') : null,
      K.note('Depois de criar, a nota "Do mundo" fica escondida no mapa, só para você.'));
  }
  const resumoBloco = info => [info.reino ? info.reino.nome || info.reino.regiao : null, info.perto ? info.perto.length + ' por perto' : null].filter(Boolean).join(' · ') || 'o hexágono';
  // depois de criar: as cores, o nome dos guardas e a nota
  function aplicar(sc, info) {
    if (!info) return '';
    const o = prefs(), partes = [];
    if (o.reino && info.reino && info.reino.cores) {
      let n = 0;
      for (const t of sc.tokens) if (t.prop && Props.P[t.prop] && Props.P[t.prop].cores) { t.cores = info.reino.cores.slice(); n++; }
      if (n) partes.push(`${n} ${n === 1 ? 'estandarte' : 'estandartes e brasões'} com as cores`);
    }
    if (o.reino && info.reino && info.reino.nome) {
      let n = 0;
      for (const t of sc.tokens) if (!t.prop && t.ronda && typeof t.ronda === 'object') { t.name = String(t.name || 'Guarda').replace(/^(Guarda|Sentinela)\b/, '$1 de ' + info.reino.nome).slice(0, 60); if (info.reino.cores) t.color = info.reino.cores[0]; n++; }
      if (n) partes.push(`${n} ${n === 1 ? 'guarda' : 'guardas'} de ${info.reino.nome}`);
    }
    const tx = nota(info, o);
    if (tx && Props.P.interesse) {
      const t = Props.novo(sc, 'interesse', sc.cell, sc.cell, 1, true);
      t.name = 'Do mundo'; t.notes = tx;
      sc.tokens.push(t);
      partes.push('a nota "Do mundo" no canto do mapa');
    }
    sc.mundo = Object.assign({}, info);
    return partes.length ? 'Do mundo: ' + partes.join(', ') + '.' : '';
  }
  return { valida, prefs, controles, resumoBloco, aplicar, nota };
})();
