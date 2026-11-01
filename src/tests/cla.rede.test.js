// Clã numa mesa de verdade (banco local de ensaio ou o projeto real), com o mestre (Bruno), o Dalmo (dono da Selene) e
// a Lia (dona da Brisa) em aparelhos separados:
//   · a aba Clã (depois da Meditação), para todos; o mestre cria a Lâmina do Crepúsculo (o clã dos jogadores), põe a
//     Selene na liderança e a Brisa num cargo, e cria a Casa Varonil (de NPC, escondida), com uma relação entre as duas;
//   · o Dalmo (a Selene lidera) vê o salão da Lâmina, sem a Varonil (nem o clã inteiro chega a ele), e mexe nos cargos:
//     cria os Batedores, põe o Tobias, desfaz — o banco confere e grava, o mestre vê, o histórico conta;
//   · a Lia vê o salão sem mexer em nada; o mestre mostra a Varonil (os cargos): ela aparece para os dois, sem o respeito
//     dos membros, e a relação passa a aparecer na Lâmina; esconde de novo, e ela some;
//   · o mestre passa a liderança à Brisa: a Lia passa a mexer nos cargos, o Dalmo não (a recusa vem do banco);
//   · o banco (SQL 0018): quem lê e quem escreve cada documento do Clã, o que o banco monta para os jogadores (igual à
//     conta da página), a função do líder, o mestre auxiliar com e sem a aba Clã.
// SO=banco roda só a parte do banco, numa mesa criada direto pelo banco (é o que os mutantes do SQL usam).
// (Sem mesa — os clãs, os cargos, as construções, o brasão, o salão —: src/tests/cla.test.js.) FOTOS=<pasta> guarda capturas.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const C = require('../../cla/nucleo.js');
const { ok, end } = checker();
const j = JSON.stringify;
const ficha = nome => ({ nome, raca: 'Kitsune', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'C', AGI: 'C', VIT: 'D', CAN: 'B' }, pctProprio: null, poderes: [],
  defesas: { DFF: 3, DFM: 6 }, defEsp: {}, rol: { fixa: 5, fonte: 'total' }, ini: 'AGI/5', disputa: {}, estaque: { a: '', b: '' }, habilidades: [], notas: '', itens: [],
  recursos: [{ id: 'hp', nome: 'HP', fml: '100' }, { id: 'sp', nome: 'SP', fml: '60' }] });

// Os clãs do banco (com ids fixos, criados aqui): a Lâmina (dos jogadores, a Selene lidera), a Varonil (NPC à mostra:
// cargos e respeito) e a Ordem (NPC escondida).
const LAM = { v: 1, nome: 'Lâmina (banco)', lema: 'Onde a luz termina', ordem: 1, jogadores: true, ver: {}, brasao: { forma: 'escudo', div: 'partido', cores: ['#24305e', '#d9a441'], simb: 'lua', img: null },
  faccao: { id: 'fc_vale', nome: 'Liga do Vale', cor: '#5a8fd0' },
  cargos: { lider: { nome: 'Líder', pai: null, ordem: 0, gente: [{ id: 'p1', pc: 'pc_selene', nome: 'Selene', resp: 3 }] }, k1: { nome: 'Conselheira', pai: 'lider', ordem: 0, gente: [{ id: 'p2', pc: 'pc_brisa', nome: 'Brisa', resp: 2 }] } },
  construcoes: [{ id: 'f1', nome: 'Forja', ico: 'forja', nivel: 2, efeito: 'Armas.', prox: { custo: [{ rec: 'r1', nome: 'Ferro', qtd: 45 }], efeito: '' } }],
  recursos: { lista: [{ id: 'r1', nome: 'Ferro', qtd: 18 }], hist: [] }, respeito: { v: 2, hist: [] },
  relacoes: [{ id: 'y1', tipo: 'faccao', alvo: 'fc_vale', nome: 'Liga do Vale', cor: '#5a8fd0', v: 3 }, { id: 'y2', tipo: 'cla', alvo: 'sb_var', v: -3 }, { id: 'y3', tipo: 'cla', alvo: 'sb_cor', v: -1 }],
  hist: [{ em: '2026-10-03T00:00:00.000Z', tipo: 'rel', alvoTipo: 'cla', alvo: 'sb_cor', nome: 'Ordem', de: 0, para: -1, mot: '' }, { em: '2026-10-02T00:00:00.000Z', tipo: 'rel', alvoTipo: 'cla', alvo: 'sb_var', nome: 'Casa Varonil', de: 0, para: -3, mot: '' },
    { em: '2026-10-01T00:00:00.000Z', tipo: 'membro', pid: 'p2', nome: 'Brisa', de: 0, para: 2, mot: '' }] };
const VAR = { v: 1, nome: 'Casa Varonil (banco)', lema: 'Ferro e honra', ordem: 2, jogadores: false, ver: { mostrar: true, cargos: true, respeito: true, hist: true }, brasao: { forma: 'escudo', div: 'cortado', cores: ['#8a2a2a', '#c9ccd4'], simb: null, img: null },
  cargos: { lider: { nome: 'Lorde', pai: null, ordem: 0, gente: [{ id: 'v1', pc: null, nome: 'Lorde Aster', resp: 3 }] }, s1: { nome: 'Espiã-mor', pai: 'lider', ordem: 0, gente: [{ id: 'v2', pc: null, nome: 'Vesna', resp: 1 }] } },
  construcoes: [{ id: 'k1', nome: 'Muralha', nivel: 2 }], recursos: { lista: [{ id: 'r1', nome: 'Ouro', qtd: 900 }], hist: [] }, respeito: { v: 1, hist: [] }, relacoes: [{ id: 'x1', tipo: 'cla', alvo: 'sb_lam', v: -3 }],
  hist: [{ em: '2026-10-02T00:00:00.000Z', tipo: 'membro', pid: 'v2', nome: 'Vesna', de: 0, para: 1, mot: '' }, { em: '2026-10-01T00:00:00.000Z', tipo: 'resp', de: 0, para: 1, mot: '' }, { em: '2026-09-30T00:00:00.000Z', tipo: 'rec', mud: [{ rec: 'r1', n: 'Ouro', d: 100 }], mot: '' }] };
const COR = { v: 1, nome: 'Ordem do Corvo (banco)', ordem: 3, jogadores: false, ver: { mostrar: false, cargos: true }, brasao: { cores: ['#1b1b22', '#e8eaf0'] }, cargos: { lider: { nome: 'Grão-mestre', pai: null, ordem: 0, gente: [{ id: 'q1', pc: null, nome: 'Corvo Branco', resp: 5 }] } } };

// O banco (SQL 0018). doZero: a mesa ainda não tem os personagens (nascem aqui).
async function sondarBanco(t, c, mesa, dalmo, lia, doZero) {
  const sonda = async (email, nome) => { const d = await t.device({ name: 'sonda-' + nome }); await d.page.goto(t.base + 'src/tests/vazio.html'); const r = await entrar(d.page, email, c.senha, nome); return { d, p: d.page, uid: r.uid }; };
  const sB = await sonda(c.mestre, 'Bruno'), sD = await sonda(c.jog1, 'Dalmo'), sL = await sonda(c.jog2, 'Lia');
  const ids = s => s.p.evaluate(async mesa => { const r = await sb.from('documentos').select('id').eq('mesa_id', mesa).eq('apagado', false).like('id', 'cla:%'); return r.error ? 'erro: ' + r.error.message : r.data.map(x => x.id).filter(x => /sb_/.test(x)).sort().join(','); }, mesa);
  const ler = (s, id) => s.p.evaluate(async ([mesa, id]) => { const r = await sb.from('documentos').select('dados, apagado, vis').eq('mesa_id', mesa).eq('id', id).maybeSingle(); return r.error || !r.data ? null : r.data; }, [mesa, id]);
  const criar = (s, linha) => s.p.evaluate(async ([mesa, linha]) => { const r = await sb.from('documentos').upsert(Object.assign({ mesa_id: mesa, dados: {}, apagado: false }, linha)); return r.error ? 'recusado' : 'ok'; }, [mesa, linha]);
  const mudar = (s, id, campos) => s.p.evaluate(async ([mesa, id, campos]) => { const r = await sb.from('documentos').update(campos).eq('mesa_id', mesa).eq('id', id).select('id'); return r.error ? 'recusado' : (r.data || []).length ? 'ok' : 'nada'; }, [mesa, id, campos]);
  const rpc = (s, f, a) => s.p.evaluate(async ([f, a]) => { const r = await sb.rpc(f, a); return r.error ? r.error.message : 'ok ' + JSON.stringify(r.data); }, [f, a]);
  const cargos = (s, cla, mudar_, txt) => rpc(s, 'cla_cargos', { p_mesa: mesa, p_cla: cla, p_mudar: mudar_, p_txt: txt || '' });
  const donoDoPc = (s, id, dono) => s.p.evaluate(async ([mesa, id, dono]) => { const r = await sb.from('personagens').update({ dono_id: dono }).eq('mesa_id', mesa).eq('id', id).select('id'); return r.error ? 'recusado' : (r.data || []).length ? 'ok' : 'nada'; }, [mesa, id, dono]);
  // a conta da página (projetar) contra o que o banco montou, clã por clã
  const confere = async rotulo => {
    const todos = await sB.p.evaluate(async mesa => { const r = await sb.from('documentos').select('id, dados, apagado').eq('mesa_id', mesa).like('id', 'cla:c:%'); return r.data || []; }, mesa);
    const crus = todos.map(x => Object.assign({}, x.dados, { id: x.id.slice(6), apagado: x.apagado }));
    const ruins = [];
    for (const x of crus) {
      const pub = await ler(sB, 'cla:pub:' + x.id), a = C.normPub(C.projetar(x, crus)), b = pub && !pub.apagado ? C.normPub(pub.dados) : null;
      if (j(a) !== j(b)) ruins.push(x.id + ': página ' + j(a).slice(0, 160) + ' · banco ' + j(b).slice(0, 160));
    }
    ok(!ruins.length, 'o que o banco montou para os jogadores é a mesma conta da página (' + rotulo + ')' + (ruins.length ? ' — ' + ruins.join(' | ') : ''));
  };
  try {
    if (doZero) {
      const pcs = await sB.p.evaluate(async ([mesa, dalmo, lia]) => {
        const r = await sb.from('personagens').insert([
          { mesa_id: mesa, id: 'pc_selene', nome: 'Selene', dono_id: dalmo, vis: 'mesa' },
          { mesa_id: mesa, id: 'pc_brisa', nome: 'Brisa', dono_id: lia, vis: 'mesa' },
          { mesa_id: mesa, id: 'npc_monge', nome: 'Monge', vis: 'mesa' }]);
        return r.error ? r.error.message : 'ok';
      }, [mesa, dalmo, lia]);
      ok(pcs === 'ok', '(o mestre cria a Selene, do Dalmo, a Brisa, da Lia, e o Monge, sem dono) ' + pcs);
    }
    ok(await criar(sD, { id: 'cla:c:sb_meu', vis: 'mestre', dados: LAM }) === 'recusado' && await criar(sL, { id: 'cla:nomes', vis: 'mesa', dados: { v: 1 } }) === 'recusado', 'os jogadores não criam clãs nem os nomes dos níveis');
    ok(await criar(sB, { id: 'cla:c:sb_cor', vis: 'mestre', dados: COR }) === 'ok' && await criar(sB, { id: 'cla:c:sb_var', vis: 'mestre', dados: VAR }) === 'ok' && await criar(sB, { id: 'cla:c:sb_lam', vis: 'mestre', dados: LAM }) === 'ok',
      'o mestre cria a Lâmina (dos jogadores), a Varonil (NPC à mostra) e a Ordem (NPC escondida)');
    ok(await criar(sB, { id: 'cla:c:sb_aberto', vis: 'mesa', dados: COR }) === 'recusado' && await criar(sB, { id: 'cla:pub:sb_falso', vis: 'mesa', dados: { v: 1, nome: 'x' } }) === 'recusado',
      'nem o mestre deixa o clã inteiro para a mesa ler, nem escreve o que a mesa vê (é o banco que monta)');
    ok(await criar(sB, { id: 'cla:c:sb_dono', vis: 'mestre', dono_id: dalmo, dados: COR }) === 'recusado', 'nem dá o clã inteiro a um jogador (como dono, ele o leria)');
    ok(await criar(sB, { id: 'cla:nomes', vis: 'mesa', dados: { v: 1, mundo: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'Prestigiado', 'i', 'j', 'k'] } }) === 'ok' && ((await ler(sD, 'cla:nomes')) || { dados: {} }).dados.mundo[7] === 'Prestigiado'
      && await mudar(sD, 'cla:nomes', { dados: {} }) === 'nada', 'os nomes dos níveis: o mestre escreve, os jogadores leem (e não mudam)');
    // quem lê o quê
    const vD = await ids(sD), vL = await ids(sL), vB = await ids(sB);
    ok(vD === 'cla:pub:sb_lam,cla:pub:sb_var' && vL === vD, 'os jogadores leem o que a mesa vê da Lâmina e da Varonil — não os clãs inteiros, nem a Ordem: ' + vD);
    ok(['cla:c:sb_cor', 'cla:c:sb_lam', 'cla:c:sb_var', 'cla:pub:sb_lam', 'cla:pub:sb_var'].every(x => vB.split(',').includes(x)) && !vB.includes('cla:pub:sb_cor'), 'o mestre lê os clãs inteiros (a Ordem não tem o que a mesa vê): ' + vB);
    {
      const pl = (await ler(sD, 'cla:pub:sb_lam')).dados, pv = (await ler(sD, 'cla:pub:sb_var')).dados;
      ok(Object.values(pl.ver).every(x => x === true) && pl.cargos.k1.gente[0].resp === 2 && pl.relacoes.map(r => r.alvo).join() === 'fc_vale,sb_var' && pl.relacoes[1].nome === 'Casa Varonil (banco)'
        && pl.hist.map(e => e.alvo || e.pid).join() === 'sb_var,p2', 'a Lâmina inteira, sem a relação (nem a linha do histórico) com a Ordem escondida; a relação com a Varonil leva o nome dela');
      ok(pv.ver.construcoes === false && !('construcoes' in pv) && !('recursos' in pv) && !('relacoes' in pv) && !('resp' in pv.cargos.s1.gente[0]) && pv.hist.map(e => e.tipo).join() === 'resp',
        'a Varonil: só as partes marcadas; sem o respeito dos membros; o histórico só das partes à mostra');
    }
    await confere('no começo');
    // quem escreve o quê
    ok(await mudar(sD, 'cla:c:sb_lam', { dados: {} }) === 'nada' && await mudar(sD, 'cla:pub:sb_lam', { dados: {} }) === 'nada' && await mudar(sL, 'cla:pub:sb_var', { apagado: true }) === 'nada',
      'os jogadores não mudam o clã nem o que a mesa vê dele');
    ok(await mudar(sB, 'cla:pub:sb_lam', { dados: { v: 1, nome: 'Outro' } }) === 'recusado' && await mudar(sB, 'cla:c:sb_lam', { vis: 'mesa' }) === 'recusado', 'nem o mestre escreve direto no que a mesa vê, nem abre o clã inteiro');
    ok(await mudar(sB, 'cla:c:sb_var', { dados: Object.assign({}, VAR, { ver: { mostrar: false } }) }) === 'ok', 'o mestre esconde a Varonil');
    {
      const pv = await ler(sB, 'cla:pub:sb_var'), pl = (await ler(sD, 'cla:pub:sb_lam')).dados;
      ok(pv.apagado === true && j(pv.dados) === '{"oculto":true,"v":1}' || (pv.apagado === true && pv.dados.oculto === true && Object.keys(pv.dados).length === 2), 'o que a mesa via da Varonil: apagado e vazio');
      ok(!(await ids(sD)).includes('sb_var') && pl.relacoes.map(r => r.alvo).join() === 'fc_vale' && !pl.hist.some(e => e.alvo === 'sb_var'), 'o Dalmo não tem mais a Varonil, e a Lâmina perde a relação com ela');
    }
    ok(await mudar(sB, 'cla:c:sb_var', { dados: VAR }) === 'ok' && await mudar(sB, 'cla:c:sb_cor', { dados: Object.assign({}, COR, { nome: 'Ordem do Corvo Branco (banco)', ver: { mostrar: true, cargos: true } }) }) === 'ok',
      'o mestre mostra a Varonil de novo, e a Ordem (com outro nome)');
    {
      const pl = (await ler(sD, 'cla:pub:sb_lam')).dados;
      ok(pl.relacoes.map(r => r.alvo + '=' + r.nome).join() === 'fc_vale=Liga do Vale,sb_var=Casa Varonil (banco),sb_cor=Ordem do Corvo Branco (banco)' && pl.hist.length === 3, 'a Lâmina volta a mostrar as relações (e as linhas delas)');
    }
    ok(await mudar(sB, 'cla:c:sb_var', { dados: Object.assign({}, VAR, { nome: 'Casa Varonil de Kesh (banco)' }) }) === 'ok'
      && (await ler(sD, 'cla:pub:sb_lam')).dados.relacoes.find(r => r.alvo === 'sb_var').nome === 'Casa Varonil de Kesh (banco)', 'o mestre renomeia a Varonil: a relação na Lâmina leva o nome novo');
    {
      // a Lâmina sem a relação com a Ordem, mas com a linha do histórico sobre ela: escondendo a Ordem, a linha sai
      const semRel = Object.assign({}, LAM, { relacoes: LAM.relacoes.filter(r => r.alvo !== 'sb_cor') });
      ok(await mudar(sB, 'cla:c:sb_lam', { dados: semRel }) === 'ok' && (await ler(sD, 'cla:pub:sb_lam')).dados.hist.some(e => e.alvo === 'sb_cor'), '(o mestre tira a relação com a Ordem; a linha do histórico fica)');
      ok(await mudar(sB, 'cla:c:sb_cor', { dados: COR }) === 'ok' && !(await ler(sD, 'cla:pub:sb_lam')).dados.hist.some(e => e.alvo === 'sb_cor'), 'escondendo a Ordem, a linha sobre ela sai do histórico da Lâmina');
      ok(await mudar(sB, 'cla:c:sb_cor', { dados: Object.assign({}, COR, { nome: 'Ordem do Corvo Branco (banco)', ver: { mostrar: true, cargos: true } }) }) === 'ok'
        && await mudar(sB, 'cla:c:sb_lam', { dados: LAM }) === 'ok' && await mudar(sB, 'cla:c:sb_var', { dados: VAR }) === 'ok', '(e volta tudo como estava)');
    }
    await confere('depois de mostrar e esconder');
    // o líder mexe nos cargos
    ok(/^ok/.test(await cargos(sD, 'sb_lam', { k2: { nome: 'Batedores', pai: 'k1', ordem: 0, gente: [{ id: 'p3', nome: 'Tobias' }] }, k1: { nome: 'Conselheira', pai: 'lider', ordem: 0, gente: [{ id: 'p2', pc: 'pc_brisa', nome: 'Brisa', resp: -5 }] } }, 'criou o cargo Batedores')),
      'a Selene (o Dalmo) cria os Batedores, com o Tobias');
    {
      const cl = (await ler(sB, 'cla:c:sb_lam')).dados, pl = (await ler(sL, 'cla:pub:sb_lam')).dados;
      ok(cl.cargos.k2.nome === 'Batedores' && cl.cargos.k2.gente[0].resp === 0 && cl.cargos.k1.gente[0].resp === 2 && cl.hist[0].txt === 'Selene (líder): criou o cargo Batedores.' && pl.cargos.k2.gente[0].nome === 'Tobias',
        'no clã: os Batedores; o Tobias com 0 (pessoa nova); a Brisa continua com 2 (o líder não muda o respeito); o histórico; a Lia já vê');
    }
    ok(/Só quem ocupa o cargo de líder/.test(await cargos(sL, 'sb_lam', { k3: { nome: 'Guardas', pai: 'lider', ordem: 1, gente: [] } })), 'a Lia (não lidera) não mexe nos cargos');
    ok(/O cargo de líder só quem mestra/.test(await cargos(sD, 'sb_lam', { lider: { nome: 'Rainha', pai: null, ordem: 0, gente: [{ id: 'p1', pc: 'pc_selene', nome: 'Selene' }] } })), 'nem o líder mexe no cargo de líder');
    ok(/sem ligação com o líder/.test(await cargos(sD, 'sb_lam', { k1: { nome: 'Conselheira', pai: 'k2', ordem: 0, gente: [] } })) && /sem ligação com o líder/.test(await cargos(sD, 'sb_lam', { k9: { nome: 'X', pai: 'nada', ordem: 0, gente: [] } })),
      'a árvore continua inteira (nem ciclo, nem cargo pendurado no nada)');
    ok(/duas vezes/.test(await cargos(sD, 'sb_lam', { k9: { nome: 'X', pai: 'lider', ordem: 0, gente: [{ id: 'p2', nome: 'Brisa de novo' }] } })) && /Só o clã dos jogadores/.test(await cargos(sD, 'sb_var', { s9: { nome: 'X', pai: 'lider', ordem: 0, gente: [] } })),
      'ninguém repetido; e só no clã dos jogadores');
    ok(/sem identificação|precisa de um nome/.test(await cargos(sD, 'sb_lam', { k9: { nome: 'X', pai: 'lider', ordem: 0, gente: [{ id: 'p9', nome: '   ' }] } }))
      && /Todo cargo precisa de um nome/.test(await cargos(sD, 'sb_lam', { k9: { nome: '  ', pai: 'lider', ordem: 0, gente: [] } })), 'nem pessoa sem nome, nem cargo sem nome');
    {
      const gente = Array.from({ length: 31 }, (_, i) => ({ id: 'g' + i, nome: 'Guarda ' + i })), muitos = {};
      for (let i = 0; i < 60; i++) muitos['m' + i] = { nome: 'Cargo ' + i, pai: 'lider', ordem: i, gente: [] };
      ok(/no máximo 30 pessoas/.test(await cargos(sD, 'sb_lam', { k9: { nome: 'Guardas', pai: 'lider', ordem: 0, gente } })) && /no máximo 60 cargos/.test(await cargos(sD, 'sb_lam', muitos)),
        'no máximo 30 pessoas num cargo, e 60 cargos abaixo do líder');
      ok(/^ok/.test(await cargos(sD, 'sb_lam', { k9: { nome: 'N'.repeat(100), pai: 'lider', ordem: 0, gente: [{ id: 'p9', nome: 'P'.repeat(100) }] } })) && (await ler(sB, 'cla:c:sb_lam')).dados.cargos.k9.nome.length === 60
        && (await ler(sB, 'cla:c:sb_lam')).dados.cargos.k9.gente[0].nome.length === 60 && /^ok/.test(await cargos(sD, 'sb_lam', { k9: null })), 'um nome comprido demais fica com 60 letras (o do cargo e o da pessoa)');
    }
    ok(/^ok/.test(await cargos(sD, 'sb_lam', { k2: null }, 'apagou o cargo Batedores')) && !(await ler(sB, 'cla:c:sb_lam')).dados.cargos.k2, 'a Selene apaga os Batedores');
    {
      const k1 = (await ler(sB, 'cla:c:sb_lam')).dados.cargos.k1;
      ok(/^ok/.test(await cargos(sD, 'sb_lam', { k1: Object.assign({}, k1, { gente: [] }) }, 'tirou a Brisa')) && (await ler(sB, 'cla:c:sb_lam')).dados.respGuardado.p2 === 2
        && !('respGuardado' in (await ler(sD, 'cla:pub:sb_lam')).dados), 'a Selene tira a Brisa da Conselheira: o banco guarda o respeito dela (e não o mostra aos jogadores)');
      ok(/^ok/.test(await cargos(sD, 'sb_lam', { k1 }, 'desfez')) && (await ler(sB, 'cla:c:sb_lam')).dados.cargos.k1.gente[0].resp === 2 && !('p2' in ((await ler(sB, 'cla:c:sb_lam')).dados.respGuardado || {})),
        'desfazendo, a Brisa volta com o respeito dela (+2)');
    }
    ok(await donoDoPc(sB, 'pc_selene', lia) === 'ok' && /Só quem ocupa/.test(await cargos(sD, 'sb_lam', { k3: { nome: 'Guardas', pai: 'lider', ordem: 1, gente: [] } }))
      && /^ok/.test(await cargos(sL, 'sb_lam', { k3: { nome: 'Guardas', pai: 'lider', ordem: 1, gente: [] } })), 'a Selene passa para a Lia: agora quem mexe nos cargos é ela');
    ok(await donoDoPc(sB, 'pc_selene', dalmo) === 'ok' && /^ok/.test(await cargos(sB, 'sb_lam', { k3: null }, 'tirou os Guardas')), '(o mestre devolve a Selene ao Dalmo; quem mestra também usa a função)');
    await confere('depois do líder');
    // o mestre auxiliar: com a aba Clã, mestra o Clã; sem ela, é jogador aqui
    ok(/^ok/.test(await rpc(sB, 'definir_auxiliar', { p_mesa: mesa, p_usuario: lia, p_auxiliar: true, p_abas: ['cla'] })), 'o mestre faz da Lia mestra auxiliar só com a aba Clã');
    ok((await ids(sL)).includes('cla:c:sb_cor') && await mudar(sL, 'cla:c:sb_var', { dados: Object.assign({}, VAR, { lema: 'Pela Lia' }) }) === 'ok' && (await ler(sD, 'cla:pub:sb_var')).dados.lema === 'Pela Lia',
      'com a aba Clã, ela lê os clãs inteiros e muda a Varonil (o Dalmo já vê o lema novo)');
    ok(/^ok/.test(await rpc(sB, 'definir_auxiliar', { p_mesa: mesa, p_usuario: lia, p_auxiliar: true, p_abas: ['cenas'] })) && !(await ids(sL)).includes('cla:c:') && await mudar(sL, 'cla:c:sb_var', { dados: VAR }) === 'nada',
      'sem a aba Clã, não');
    ok(/^ok/.test(await rpc(sB, 'definir_auxiliar', { p_mesa: mesa, p_usuario: lia, p_auxiliar: false })), '(a Lia volta a ser jogadora)');
    // apagar e desfazer
    ok(await mudar(sB, 'cla:c:sb_cor', { apagado: true }) === 'ok' && (await ler(sB, 'cla:pub:sb_cor')).apagado === true && !(await ler(sD, 'cla:pub:sb_lam')).dados.relacoes.some(r => r.alvo === 'sb_cor'),
      'apagar a Ordem: o que a mesa via some, e a relação com ela também');
    ok(await mudar(sB, 'cla:c:sb_cor', { apagado: false }) === 'ok' && (await ler(sD, 'cla:pub:sb_cor') || {}).apagado === false, 'desfazer: volta');
    await confere('no fim');
  } finally {
    for (const s of [sB, sD, sL]) await s.d.ctx.close();
  }
}

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await entrar(d.page, c.jog2, c.senha, 'Lia'); await d.ctx.close(); }
  const errosDeFora = () => t.errs.filter(e => !/^\[sonda-/.test(e) || !/status of (400|401|403|409)/.test(e)).filter(e => !/status of (400|401|409)/.test(e));
  if (process.env.SO === 'banco') {
    const d = await t.device({ name: 'banco' }); await d.page.goto(t.base + 'src/tests/vazio.html');
    const um = async (email, nome, codigo) => d.page.evaluate(async ([email, senha, nome, codigo]) => {
      const e = await sb.auth.signInWithPassword({ email, password: senha }); if (e.error) return { erro: e.error.message };
      const uid = e.data.user.id;
      if (!codigo) {
        const r = await sb.rpc('criar_mesa', { p_nome: 'Clã banco ' + Date.now().toString(36), p_meu_nome: nome }); if (r.error) return { erro: r.error.message };
        const cv = await sb.from('mesa_convites').select('codigo').eq('mesa_id', r.data.id).single();
        return { uid, mesa: r.data.id, codigo: cv.data && cv.data.codigo };
      }
      const r = await sb.rpc('entrar_na_mesa', { p_codigo: codigo, p_meu_nome: nome }); return r.error ? { erro: r.error.message } : { uid };
    }, [email, c.senha, nome, codigo || null]);
    const b = await um(c.mestre, 'Bruno'), dj = await um(c.jog1, 'Dalmo', b.codigo), lj = await um(c.jog2, 'Lia', b.codigo);
    ok(b.mesa && dj.uid && lj.uid, '(a mesa e os dois jogadores, direto pelo banco) ' + JSON.stringify([b.erro, dj.erro, lj.erro]));
    try { await sondarBanco(t, c, b.mesa, dj.uid, lj.uid, true); }
    finally {
      await d.page.evaluate(async ([email, senha, mesa]) => { await sb.auth.signInWithPassword({ email, password: senha }); await sb.from('mesas').delete().eq('id', mesa); }, [c.mestre, c.senha, b.mesa]);
      await d.ctx.close();
    }
    const fora = errosDeFora();
    if (fora.length) console.log('CONSOLE:\n' + fora.join('\n'));
    ok(fora.length === 0, 'sem erros inesperados no console');
    await t.close(); end(); return;
  }
  const M = (await t.device({ name: 'mestre', w: 1440, h: 950, seed: { 'tinycats:aba': 'cla', 'tinycats-tour': '1' } })).page;
  const Dp = (await t.device({ name: 'dalmo', w: 1360, h: 900, seed: { 'tinycats:aba': 'cla', 'tinycats-tour': '1' } })).page;
  const Lp = (await t.device({ name: 'lia', w: 1360, h: 900, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 80) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const abas = p => p.evaluate(() => [...document.querySelectorAll('.tab')].filter(x => !x.hidden).map(x => x.id.slice(4)).join(','));
  const docDe = (p, id) => p.evaluate(id => { const l = TC.dados.col('documentos').pegar(id); return l && !l.apagado ? JSON.parse(JSON.stringify(l.dados)) : null; }, id);
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const pronta = (f, mestre) => f.evaluate(m => !!window.__cla && __cla.pronto && __cla.naMesa && __cla.mestre === m, mestre);
  const docF = (f, id) => f.evaluate(id => __cla.doc(id), id);
  async function botao(f, sel) { await f.locator(sel).click(); await f.waitForTimeout(250); }
  async function dlg(f, campos, sim) { for (const [k, v] of Object.entries(campos || {})) await f.locator(`#dlg [data-k="${k}"]`).fill(v); await botao(f, `#dlg [data-k="${sim || 'dl:sim'}"]`); }
  const texto = async (f, sel) => (await f.locator(sel).innerText()).replace(/\s+/g, ' ');
  const foto = async (p, nome) => { if (process.env.FOTOS) await p.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Clã E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa);
  let apagada = false, mesa = null;
  try {
    mesa = await M.evaluate(() => TC.mesas.atual.id);
    await Dp.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1200, Dp);
    await loginTela(Dp, c.jog1, c.senha); await entrarMesaTela(Dp, codigo, 'Dalmo');
    const dalmo = await Dp.evaluate(() => TC.conta.usuario.id);
    await Lp.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1200, Lp);
    await loginTela(Lp, c.jog2, c.senha); await entrarMesaTela(Lp, codigo, 'Lia');
    const lia = await Lp.evaluate(() => TC.conta.usuario.id);
    ok(await abas(M) === 'cenas,fichas,rolador,mundo,jornal,cla,livro,acampamento,meditacao,oficina,bestiario,itens,escudo' && await abas(Dp) === 'cenas,fichas,arvore,mundo,jornal,cla,acampamento,meditacao',
      'a aba Clã, na ordem dos grupos de abas: para o mestre e para os jogadores — ' + await abas(Dp));
    await M.evaluate(([d, l, fs, fb, fm]) => {
      const P = TC.dados.col('personagens');
      P.gravar('pc_selene', { nome: 'Selene', ficha: fs, skills: {}, estado: {}, dono_id: d, vis: 'mesa', ordem: 0 });
      P.gravar('pc_brisa', { nome: 'Brisa', ficha: fb, skills: {}, estado: {}, dono_id: l, vis: 'mesa', ordem: 1 });
      P.gravar('npc_monge', { nome: 'Monge', ficha: fm, skills: {}, estado: {}, vis: 'mesa', ordem: 2 });
    }, [dalmo, lia, ficha('Selene'), ficha('Brisa'), ficha('Monge')]);
    ok(await ate(() => parado(M)), '(as fichas da Selene, do Dalmo, da Brisa, da Lia, e do Monge, sem dono, sobem para a mesa)');

    // ---------- o mestre cria os clãs ----------
    let CM = null;
    ok(await ate(async () => { CM = await quadro(M, /\/cla\//); return CM && await pronta(CM, true); }, 40000), '(na mesa, o mestre abre o Clã como quem mestra)');
    await botao(CM, '[data-k="novo-cla"]'); await dlg(CM, { 'dl:nome': 'Lâmina do Crepúsculo' });
    const lam = await CM.evaluate(() => __cla.sel);
    await botao(CM, '[data-k="c:lider"]'); await CM.locator('#dlg [data-k="dl:novo"]').selectOption('p:pc_selene'); await botao(CM, '#dlg [data-k="dl:sim"]');
    await botao(CM, '[data-k="sub:lider"]'); await dlg(CM, { 'dl:nome': 'Conselheira' });
    const k1 = await CM.evaluate(() => { const c = __cla.doc('cla:c:' + __cla.sel).cargos; return Object.keys(c).find(x => c[x].nome === 'Conselheira'); });
    await botao(CM, `[data-k="pes:${k1}"]`); await CM.locator('#dlg [data-k="dl:pc"]').selectOption('pc_brisa'); await botao(CM, '#dlg [data-k="dl:sim"]');
    await botao(CM, '[data-k="novo-cla"]'); await dlg(CM, { 'dl:nome': 'Casa Varonil' });
    const varo = await CM.evaluate(() => __cla.sel);
    await botao(CM, '[data-k="sub:lider"]'); await dlg(CM, { 'dl:nome': 'Espiã-mor' });
    await botao(CM, `.cla-item[data-cla="${lam}"]`);
    await botao(CM, '[data-k="rel:nova"]'); await CM.locator('#dlg [data-k="dl:alvo"]').selectOption('cla:' + varo); await CM.locator('#dlg [data-k="dl:valor"]').selectOption('-3'); await botao(CM, '#dlg [data-k="dl:sim"]');
    ok(await ate(async () => { const x = await docDe(M, 'cla:c:' + lam); return !!x && x.jogadores && x.cargos.lider.gente[0].pc === 'pc_selene' && x.cargos[k1].gente[0].pc === 'pc_brisa' && x.relacoes[0].alvo === varo && await parado(M); }),
      'a Lâmina vai para a mesa: a Selene lidera, a Brisa é a Conselheira, a relação com a Varonil');
    ok(await ate(async () => { const p = await docDe(M, 'cla:pub:' + lam); return !!p && p.cargos[k1].gente[0].nome === 'Brisa' && p.relacoes.length === 0; }), 'o banco monta o que a mesa vê da Lâmina (sem a relação com a Varonil, escondida)');
    ok(await docDe(M, 'cla:pub:' + varo) === null, 'da Varonil, escondida, nada para a mesa');

    // ---------- o Dalmo: o salão, e ele lidera ----------
    let CD = null;
    ok(await ate(async () => { CD = await quadro(Dp, /\/cla\//); return CD && await pronta(CD, false); }, 40000), '(o Dalmo abre o Clã, como jogador)');
    ok(await ate(async () => (await CD.locator('#nomeCla h1').innerText()) === 'Lâmina do Crepúsculo' && await CD.locator('[data-k="sou-lider"]').isVisible()), 'o Dalmo vê o salão da Lâmina — e o aviso de que lidera (a Selene)');
    ok(/Você é quem lidera \(Selene\)/.test(await texto(CD, '[data-k="sou-lider"]')) && await CD.locator('#vistas').count() === 0 && await CD.locator('#escolhaCla').count() === 0
      && await docF(CD, 'cla:c:' + lam) === null && await docF(CD, 'cla:pub:' + varo) === null, 'sem o painel do mestre, sem a Varonil, e sem o clã inteiro (nem chega ao aparelho dele)');
    ok(await CD.locator('[data-k="ren:lider"]').count() === 0 && /só o mestre muda/.test(await texto(CD, '[data-cargo="lider"]')) && await CD.locator(`[data-k="ren:${k1}"]`).isVisible(), 'o cargo de líder, só o mestre muda; os outros, ele');
    await botao(CD, `[data-k="sub:${k1}"]`); await dlg(CD, { 'dl:nome': 'Batedores' });
    let kb = null;
    ok(await ate(async () => { const x = await docDe(M, 'cla:c:' + lam); kb = x && Object.keys(x.cargos).find(k => x.cargos[k].nome === 'Batedores'); return !!kb && x.cargos[kb].pai === k1 && x.hist[0].txt === 'Selene (líder): criou o cargo Batedores abaixo de Conselheira.'; }),
      'o Dalmo cria os Batedores abaixo da Conselheira: o banco grava no clã (com o histórico)');
    ok(await CD.locator(`[data-cargo="${kb}"]`).count() === 1, 'o salão dele mostra os Batedores');
    {
      // quando a resposta do banco chega à página, o que a mesa vê do clã já chegou junto: a tela não espera o aviso
      const ja = (mudar, txt) => CD.evaluate(async ([id, mudar, txt]) => { await TC.ponte.cla('cargos', { cla: id, mudar, txt }); const p = __cla.pub(id); return !!p && !!p.cargos.cg_arautos; }, [lam, mudar, txt]);
      ok(await ja({ cg_arautos: { nome: 'Arautos', pai: k1, ordem: 5, gente: [] } }, 'criou o cargo Arautos') === true && await ja({ cg_arautos: null }, 'apagou o cargo Arautos') === false,
        'criar e apagar um cargo pelo banco: quando a resposta chega, o salão já está atualizado');
    }
    await botao(CD, `[data-k="pes:${kb}"]`); await botao(CD, '#dlg [data-k="dl:modo-nome"]'); await dlg(CD, { 'dl:nome': 'Tobias' });
    ok(await ate(async () => { const x = await docDe(M, 'cla:c:' + lam); return !!x && x.cargos[kb].gente.length === 1 && x.cargos[kb].gente[0].nome === 'Tobias' && x.cargos[kb].gente[0].resp === 0; }), 'põe o Tobias (com respeito 0)');
    await botao(CD, '#btDesfazer');
    ok(await ate(async () => { const x = await docDe(M, 'cla:c:' + lam); return !!x && x.cargos[kb].gente.length === 0 && /desfez a última mudança/.test(x.hist[0].txt); }), 'o Dalmo desfaz: o Tobias sai (pelo banco, e o histórico diz)');
    ok(/Só o mestre|só quem mestra|O cargo de líder/.test(await CD.evaluate(id => TC.ponte.cla('cargos', { cla: id, mudar: { lider: { nome: 'Rei', pai: null, ordem: 0, gente: [] } }, txt: 'x' }).then(() => 'foi', e => e.message), lam)),
      'pedir ao banco para mexer no cargo de líder: a recusa chega com a explicação do banco');
    await foto(Dp, 'cla-rede-dalmo');

    // ---------- a Lia: o salão, sem mexer ----------
    await Lp.locator('#tab-cla').click();
    let CL = null;
    ok(await ate(async () => { CL = await quadro(Lp, /\/cla\//); return CL && await pronta(CL, false); }, 40000), '(a Lia abre o Clã)');
    ok(await ate(async () => (await CL.locator(`[data-cargo="${kb}"]`).count()) === 1) && await CL.locator('[data-k="sou-lider"]').count() === 0 && await CL.locator('#parte button').count() === 0
      && /\+0|0/.test(await texto(CL, `[data-cargo="${k1}"] .resp`)), 'a Lia vê os cargos (com os Batedores), o respeito de cada membro, e nada para mexer');

    // ---------- o mestre mostra (e esconde) a Varonil ----------
    await botao(CM, `.cla-item[data-cla="${varo}"]`);
    await botao(CM, '[data-k="c:ver"]'); await botao(CM, '#dlg [data-ver="mostrar"]'); await botao(CM, '#dlg [data-ver="cargos"]'); await botao(CM, '#dlg [data-k="dl:fechar"]');
    ok(await ate(async () => (await CD.locator('#escolhaCla [data-cla]').count()) === 2), 'o mestre mostra a Varonil (e os cargos): ela aparece para o Dalmo');
    await botao(CD, `#escolhaCla [data-cla="${varo}"]`);
    ok(await ate(async () => /Espiã-mor/.test(await texto(CD, '#parte'))) && await CD.locator('#parte .resp').count() === 0 && await CD.locator('#abas button.tranca').count() === 5,
      'no salão da Varonil: os cargos, sem o respeito dos membros; o resto (e os membros, lote 56) trancado');
    await botao(CD, `#escolhaCla [data-cla="${lam}"]`); await botao(CD, '[data-aba="resp"]');
    ok(await ate(async () => /Casa Varonil/.test(await texto(CD, '#parte')) && /−3 · Rival/.test(await texto(CD, '#parte'))), 'e a relação da Lâmina com a Varonil passa a aparecer');
    await botao(CM, '[data-k="c:ver"]'); await botao(CM, '#dlg [data-ver="mostrar"]'); await botao(CM, '#dlg [data-k="dl:fechar"]');
    ok(await ate(async () => (await CD.locator('#escolhaCla').count()) === 0 && !/Casa Varonil/.test(await texto(CD, '#parte'))), 'o mestre esconde a Varonil de novo: ela some do Dalmo (e a relação também)');
    await botao(CD, '[data-aba="hier"]');

    // ---------- (lote 56) os membros: a Varonil mostra só os membros (sem os cargos) ----------
    await botao(CM, `.cla-item[data-cla="${varo}"]`);
    await botao(CM, '[data-k="rol:novo"]'); await CM.locator('#dlg [data-k="dl:nome"]').fill('Ivo Ferreiro'); await CM.locator('#dlg [data-k="dl:racan"]').fill('Anão'); await botao(CM, '#dlg [data-k="dl:sim"]');
    await botao(CM, '[data-k="c:ver"]'); await botao(CM, '#dlg [data-ver="mostrar"]'); await botao(CM, '#dlg [data-ver="cargos"]'); await botao(CM, '#dlg [data-ver="membros"]'); await botao(CM, '#dlg [data-k="dl:fechar"]');
    ok(await ate(async () => (await CD.locator('#escolhaCla [data-cla]').count()) === 2), '(lote 56) o mestre mostra a Varonil só com os membros');
    await botao(CD, `#escolhaCla [data-cla="${varo}"]`); await botao(CD, '[data-aba="membros"]');
    ok(await ate(async () => { const tx = await texto(CD, '#parte'); return /Ivo Ferreiro/.test(tx) && /Anão/.test(tx) && /Espiã-mor/.test(tx) === false && (await CD.locator('#parte .resp').count()) === 0; }),
      '(lote 56) o Dalmo vê os membros da Varonil (o Ivo, anão), sem os cargos e sem o respeito');
    const pubV = await M.evaluate(id => { const l = TC.dados.col('documentos').pegar('cla:pub:' + id); return l && !l.apagado ? { dados: JSON.parse(JSON.stringify(l.dados)) } : null; }, varo);
    ok(!!pubV && pubV.dados.ver.membros === true && pubV.dados.ver.cargos === false && !('cargos' in pubV.dados) && Array.isArray(pubV.dados.membros.gente) && pubV.dados.membros.avulsos.every(p => !('resp' in p)),
      '(lote 56) no banco: a parte "membros", com a gente dos cargos (sem os cargos) e sem o respeito dos avulsos');
    await botao(CM, '[data-k="c:ver"]'); await botao(CM, '#dlg [data-ver="cargos"]'); await botao(CM, '#dlg [data-ver="mostrar"]'); await botao(CM, '#dlg [data-k="dl:fechar"]');
    ok(await ate(async () => (await CD.locator('#escolhaCla').count()) === 0), '(e a Varonil escondida de novo)');

    // ---------- o respeito no mundo; passar a liderança ----------
    await botao(CM, `.cla-item[data-cla="${lam}"]`);
    await botao(CM, '[data-k="resp:mais"]'); await botao(CM, '[data-k="resp:mais"]');
    ok(await ate(async () => /Respeito no mundo: \+2 · Respeitado/.test(await texto(CL, '#chips'))), 'o mestre muda o respeito no mundo: a Lia vê "+2 · Respeitado"');
    await botao(CM, '[data-k="c:lider"]'); await CM.locator('#dlg [data-k="dl:novo"]').selectOption({ label: 'Brisa · Conselheira' }); await botao(CM, '#dlg [data-k="dl:sim"]');
    ok(await ate(async () => await CL.locator('[data-k="sou-lider"]').isVisible() && /Você é quem lidera \(Brisa\)/.test(await texto(CL, '[data-k="sou-lider"]')), 40000), 'o mestre passa a liderança à Brisa: a Lia passa a liderar');
    ok(await ate(async () => (await CD.locator('[data-k="sou-lider"]').count()) === 0 && (await CD.locator('#parte button').count()) === 0, 40000), 'e o Dalmo deixa de mexer nos cargos');
    ok(/Só quem ocupa o cargo de líder/.test(await CD.evaluate(id => TC.ponte.cla('cargos', { cla: id, mudar: { zz: { nome: 'X', pai: 'lider', ordem: 9, gente: [] } }, txt: 'x' }).then(() => 'foi', e => e.message), lam)),
      'pedindo ao banco mesmo assim: "Só quem ocupa o cargo de líder…"');
    // ---------- os nomes dos níveis (da mesa toda) e o nome de agora de cada personagem ----------
    await botao(CM, '[data-k="niveis"]'); await CM.locator('#dlg [data-k="nv:mundo:12"]').fill('Prestigiado'); await botao(CM, '#dlg [data-k="dl:sim"]');
    ok(await ate(async () => /Respeito no mundo: \+2 · Prestigiado/.test(await texto(CL, '#chips'))), 'o mestre renomeia um nível: os jogadores veem o nome novo');
    await M.evaluate(() => TC.dados.col('personagens').gravar('pc_brisa', { nome: 'Brisa do Vale' }));
    ok(await ate(async () => /Brisa do Vale/.test(await texto(CL, '[data-cargo="lider"]'))), 'o personagem renomeado aparece no cargo com o nome de agora');
    await foto(M, 'cla-rede-mestre');

    // ---------- o banco ----------
    await sondarBanco(t, c, mesa, dalmo, lia, false);

    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = errosDeFora();
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})();
