// Meditação numa mesa de verdade (banco local de ensaio ou o projeto real), com o mestre (Bruno), o Dalmo (dono da
// Selene) e a Lia (dona da Brisa) em aparelhos separados:
//   · a aba Meditação (depois da Árvore), para todos; o mestre monta o lugar e as receitas; os jogadores veem o lugar,
//     sem as receitas e sem os ambientes;
//   · o Dalmo escreve a prática da Selene (o panteão e — lote 7 — a imagem meditando vão para a ficha) e entra na
//     meditação: o mestre vê a Selene na cena, grande, com essa imagem; a Lia também, mas sem a prática;
//   · o mestre libera as tentativas; o Dalmo erra, tenta a receita que é só da Brisa e acerta a outra: descobre a
//     receita, e o aviso vai à mesa ao vivo só para ele e o mestre; o mestre limpa o registro da Selene e desfaz;
//   · o mestre tira a Selene da meditação e desfaz; a Lia entra com a Brisa; o treinamento, só o mestre vê;
//   · a Selene passa para a Lia: a prática e o que ela descobriu vão junto (e o Dalmo deixa de vê-los);
//   · o banco (SQL 0017): quem lê e quem escreve cada documento da Meditação, as funções (entrar, liberar, tentar), o
//     mestre auxiliar com e sem a aba Meditação e os documentos acompanhando o dono do personagem.
// SO=banco roda só a parte do banco, numa mesa criada direto pelo banco (é o que os mutantes do SQL usam).
// (Sem mesa — a cena, as receitas, os símbolos, os pilares, o treinamento —: src/tests/meditacao.test.js.) FOTOS=<pasta> guarda capturas.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
// uma ficha completa (como a das Fichas)
const ficha = nome => ({ nome, raca: 'Kitsune', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'C', AGI: 'C', VIT: 'D', CAN: 'B' }, pctProprio: null, poderes: [],
  defesas: { DFF: 3, DFM: 6 }, defEsp: {}, rol: { fixa: 5, fonte: 'total' }, ini: 'AGI/5', disputa: {}, estaque: { a: '', b: '' }, habilidades: [], notas: '', itens: [],
  recursos: [{ id: 'hp', nome: 'HP', fml: '100' }, { id: 'sp', nome: 'SP', fml: '60' }] });
const PNG = { name: 'meditando.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64') };
const RECEITAS = { v: 1, lista: [
  { id: 'rc_chama', nome: 'Chama do Primeiro Sol', seq: ['sol', 'fogo', 'dragao'], efeito: 'O calor do sol.', onde: null, quem: null },
  { id: 'rc_mare', nome: 'Maré', seq: ['lua', 'agua'], efeito: 'Marés.', onde: null, quem: ['pc_brisa'] },
  { id: 'rc_raiz', nome: 'Raiz Antiga', seq: ['terra', 'g1'], efeito: 'Raízes.', onde: 'floresta', quem: null },
  { id: 'rc_silencio', nome: 'Silêncio do Templo', seq: ['luz', 'sombra'], efeito: 'O templo cala.', onde: 'templo', quem: null }] };

// O banco (SQL 0017): quem lê e quem escreve cada documento da Meditação, e as funções. doZero: a mesa ainda não tem
// nada da Meditação — os personagens e os documentos nascem aqui (e as recusas de criar vêm antes).
async function sondarBanco(t, c, mesa, dalmo, lia, doZero) {
  const sonda = async (email, nome) => { const d = await t.device({ name: 'sonda-' + nome }); await d.page.goto(t.base + 'src/tests/vazio.html'); const r = await entrar(d.page, email, c.senha, nome); return { d, p: d.page, uid: r.uid }; };
  const sB = await sonda(c.mestre, 'Bruno'), sD = await sonda(c.jog1, 'Dalmo'), sL = await sonda(c.jog2, 'Lia');
  const ids = s => s.p.evaluate(async mesa => { const r = await sb.from('documentos').select('id').eq('mesa_id', mesa).eq('apagado', false).like('id', 'medit:%'); return r.error ? 'erro: ' + r.error.message : r.data.map(x => x.id).sort().join(','); }, mesa);
  const ler = (s, id) => s.p.evaluate(async ([mesa, id]) => { const r = await sb.from('documentos').select('dados, dono_id').eq('mesa_id', mesa).eq('id', id).maybeSingle(); return r.error || !r.data ? null : r.data; }, [mesa, id]);
  const criar = (s, linha) => s.p.evaluate(async ([mesa, linha]) => { const r = await sb.from('documentos').insert(Object.assign({ mesa_id: mesa, dados: {} }, linha)); return r.error ? 'recusado' : 'ok'; }, [mesa, linha]);
  const mudar = (s, id, campos) => s.p.evaluate(async ([mesa, id, campos]) => { const r = await sb.from('documentos').update(campos).eq('mesa_id', mesa).eq('id', id).select('id'); return r.error ? 'recusado' : (r.data || []).length ? 'ok' : 'nada'; }, [mesa, id, campos]);
  const rpc = (s, f, a) => s.p.evaluate(async ([f, a]) => { const r = await sb.rpc(f, a); return r.error ? r.error.message : 'ok ' + JSON.stringify(r.data); }, [f, a]);
  const medit = (s, op, a) => rpc(s, 'meditacao_' + op, Object.assign({ p_mesa: mesa }, a));
  const donoDoPc = (s, id, dono) => s.p.evaluate(async ([mesa, id, dono]) => { const r = await sb.from('personagens').update({ dono_id: dono }).eq('mesa_id', mesa).eq('id', id).select('id'); return r.error ? 'recusado' : (r.data || []).length ? 'ok' : 'nada'; }, [mesa, id, dono]);
  const avisos = s => s.p.evaluate(async mesa => { const r = await sb.from('registro').select('id, para, dados').eq('mesa_id', mesa).eq('origem', 'meditacao'); return r.error ? -1 : r.data.length; }, mesa);
  const lista = (...x) => x.sort().join(',');
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
      ok(await criar(sL, { id: 'medit:cena', vis: 'mesa', dados: { amb: 'caverna' } }) === 'recusado' && await criar(sD, { id: 'medit:quem', vis: 'mesa', dados: { quem: ['pc_selene'] } }) === 'recusado',
        'os jogadores não criam a cena nem a lista de quem medita');
      ok(await criar(sB, { id: 'medit:cena', vis: 'mesa', dados: { v: 1, amb: 'cachoeira', hora: 'noite', clima: 'nevoa' } }) === 'ok' && await criar(sB, { id: 'medit:receitas', vis: 'mestre', dados: RECEITAS }) === 'ok'
        && await criar(sB, { id: 'medit:treino', vis: 'mestre', dados: { v: 1, pcs: { pc_selene: [{ id: 'tb_chi', nome: 'Controle do chi', max: 10, n: 2 }] } } }) === 'ok'
        && await criar(sB, { id: 'medit:simbolos', vis: 'mesa', dados: { v: 1, ocultos: [], meus: [] } }) === 'ok', 'o mestre cria a cena (a cachoeira, à noite), as receitas, o treinamento e os símbolos');
      ok(await criar(sL, { id: 'medit:pratica:pc_selene', dono_id: lia, vis: 'mestre' }) === 'recusado' && await criar(sL, { id: 'medit:pratica:pc_selene', dono_id: dalmo, vis: 'mestre' }) === 'recusado',
        'a Lia não cria a prática da Selene (nem como dona, nem com o Dalmo de dono)');
      ok(await criar(sD, { id: 'medit:pratica:pc_selene', dono_id: dalmo, vis: 'mesa' }) === 'recusado' && await criar(sD, { id: 'medit:pratica:npc_monge', dono_id: dalmo, vis: 'mestre' }) === 'recusado',
        'o Dalmo não cria a prática para a mesa toda ver, nem a de um personagem que não é dele');
      ok(await criar(sD, { id: 'medit:achados:pc_selene', dono_id: dalmo, vis: 'mestre', dados: { lib: 9 } }) === 'recusado', 'nem o que a meditação guarda (as tentativas): isso é o banco que escreve');
      ok(await criar(sD, { id: 'medit:pratica:pc_selene', dono_id: dalmo, vis: 'mestre', dados: { v: 1, objeto: 'Um colar' } }) === 'ok', 'o Dalmo cria a prática da Selene, só para o mestre ver');
      ok(/^ok/.test(await medit(sD, 'entrar', { p_pc: 'pc_selene', p_entrar: true })), '(o Dalmo põe a Selene para meditar)');
    }
    if (!doZero) await criar(sB, { id: 'medit:simbolos', vis: 'mesa', dados: { v: 1, ocultos: [], meus: [] } });       // (se o mestre ainda não mexeu nos símbolos)
    // a receita da Selene (a Chama do Primeiro Sol): a desta mesa, criada aqui ou pela tela
    const r1 = ((await ler(sB, 'medit:receitas')) || { dados: { lista: [] } }).dados.lista.find(x => (x.seq || []).join() === 'sol,fogo,dragao') || {};
    // quem lê o quê
    const vD = await ids(sD), vL = await ids(sL), vB = await ids(sB);
    ok(vD === lista('medit:achados:pc_selene', 'medit:cena', 'medit:pratica:pc_selene', 'medit:quem', 'medit:simbolos'), 'o Dalmo lê a cena, quem medita, os símbolos e o que é da Selene — não as receitas, nem o treinamento: ' + vD);
    ok(!/pc_selene|receitas|treino/.test(vL), 'a Lia não lê nada da Selene, nem as receitas e o treinamento: ' + vL);
    ok(['medit:achados:pc_selene', 'medit:cena', 'medit:pratica:pc_selene', 'medit:quem', 'medit:receitas', 'medit:simbolos', 'medit:treino'].every(x => vB.split(',').includes(x)), 'o mestre lê tudo: ' + vB);
    // quem escreve o quê
    ok(await mudar(sD, 'medit:cena', { dados: { amb: 'deserto' } }) === 'nada' && await mudar(sD, 'medit:quem', { dados: { quem: ['pc_selene', 'pc_brisa'] } }) === 'nada' && await mudar(sD, 'medit:receitas', { dados: {} }) === 'nada',
      'o Dalmo não muda a cena, a lista de quem medita nem as receitas');
    ok(await mudar(sD, 'medit:achados:pc_selene', { dados: { lib: 9, feitas: 0, achadas: [], reg: [] } }) === 'recusado', 'nem as tentativas da Selene (o banco recusa)');
    ok(await mudar(sD, 'medit:pratica:pc_selene', { vis: 'mesa' }) === 'recusado' && await mudar(sD, 'medit:pratica:pc_selene', { dono_id: lia }) === 'recusado', 'nem mostra a prática à mesa, nem a passa para outra pessoa');
    ok(await mudar(sD, 'medit:pratica:pc_selene', { dados: { v: 1, objeto: 'Um colar de dentes de lobo' } }) === 'ok' && await mudar(sL, 'medit:pratica:pc_selene', { dados: {} }) === 'nada', 'a prática, o Dalmo escreve; a Lia, não');
    ok(await mudar(sB, 'medit:quem', { dados: { v: 1, quem: ['pc_selene'] } }) === 'ok' && await mudar(sB, 'medit:cena', { dados: { v: 1, amb: 'cachoeira', hora: 'noite', clima: 'nevoa' } }) === 'ok', 'o mestre escreve na cena (e na lista, para corrigir)');
    // as funções
    ok(/Só o dono do personagem \(ou quem mestra a Meditação\)/.test(await medit(sL, 'entrar', { p_pc: 'pc_selene', p_entrar: true })), 'a Lia não põe a Selene para meditar');
    ok(/Só quem mestra a Meditação libera/.test(await medit(sD, 'liberar', { p_pc: 'pc_selene', p_mais: 1 })), 'o Dalmo não libera a própria tentativa');
    ok(/tem dono/.test(await medit(sB, 'liberar', { p_pc: 'npc_monge', p_mais: 1 })), 'nem há tentativa para o Monge, sem dono');
    ok(/Só o dono do personagem tenta/.test(await medit(sB, 'tentar', { p_pc: 'pc_selene', p_seq: ['sol', 'fogo'] })), 'quem tenta os pilares é o dono (nem o mestre tenta por ele)');
    ok(/^ok/.test(await medit(sD, 'entrar', { p_pc: 'pc_selene', p_entrar: false })) && /não está meditando/.test(await medit(sD, 'tentar', { p_pc: 'pc_selene', p_seq: ['sol', 'fogo'] })), 'fora da meditação, não há tentativa');
    ok(/^ok \{"quem":\["pc_selene"\]\}/.test(await medit(sD, 'entrar', { p_pc: 'pc_selene', p_entrar: true })), 'o Dalmo volta a meditar');
    ok(/^ok \{"quem":\["pc_selene"\]\}/.test(await medit(sD, 'entrar', { p_pc: 'pc_selene', p_entrar: true })), 'entrar de novo não repete');
    {
      const e = (await ler(sD, 'medit:achados:pc_selene')).dados.reg[0];
      ok(e.tipo === 'entrou' && e.amb === 'cachoeira' && e.hora === 'noite' && e.clima === 'nevoa' && e.por === 'dono', 'ao entrar, o registro guarda o lugar, a hora e o clima (e que foi o dono) — ' + JSON.stringify(e));
      ok(/^ok/.test(await medit(sB, 'entrar', { p_pc: 'pc_brisa', p_entrar: true })) && ((await ler(sB, 'medit:achados:pc_brisa')).dados.reg[0] || {}).por === 'mestre'
        && /^ok/.test(await medit(sB, 'entrar', { p_pc: 'pc_brisa', p_entrar: false })), 'quando o mestre chama, o registro diz "chamado pelo mestre"');
    }
    let a0 = (await ler(sD, 'medit:achados:pc_selene')).dados;
    const espera = a0.lib > a0.feitas ? null : 'O mestre ainda não liberou';
    if (espera) ok(new RegExp(espera).test(await medit(sD, 'tentar', { p_pc: 'pc_selene', p_seq: ['sol', 'fogo'] })), 'sem a tentativa liberada, não tenta');
    const lib = await medit(sB, 'liberar', { p_pc: 'pc_selene', p_mais: 1 });
    ok(/^ok \{"lib":\d+,"feitas":\d+\}/.test(lib), 'o mestre libera uma tentativa: ' + lib);
    ok(/Ponha de 2 a 5 símbolos/.test(await medit(sD, 'tentar', { p_pc: 'pc_selene', p_seq: ['sol'] })) && /Há um símbolo que não existe/.test(await medit(sD, 'tentar', { p_pc: 'pc_selene', p_seq: ['sol', 'x y'] })),
      'de 2 a 5 símbolos, e só ids de símbolo');
    ok(await medit(sD, 'tentar', { p_pc: 'pc_selene', p_seq: ['lua', 'agua'] }) === 'ok {"res":"nada"}', 'a receita só da Brisa não vale para a Selene');
    ok(/O mestre ainda não liberou/.test(await medit(sD, 'tentar', { p_pc: 'pc_selene', p_seq: ['sol', 'fogo', 'dragao'] })), 'a tentativa foi usada: a próxima espera o mestre');
    await medit(sB, 'liberar', { p_pc: 'pc_selene', p_mais: 1 });
    ok(await medit(sD, 'tentar', { p_pc: 'pc_selene', p_seq: ['terra', 'g1'] }) === 'ok {"res":"nada"}', 'a receita da floresta não vale na cachoeira');
    const antes = await avisos(sB);
    await medit(sB, 'liberar', { p_pc: 'pc_selene', p_mais: 1 });
    const r = await medit(sD, 'tentar', { p_pc: 'pc_selene', p_seq: ['sol', 'fogo', 'dragao'] });
    ok(/^ok .*"res":"achou"/.test(r) && r.includes('"id":"' + r1.id + '"') && r.includes('"efeito":' + JSON.stringify(r1.efeito)), 'a combinação certa: o banco devolve a receita e o efeito — ' + r);
    const nova = /"nova":true/.test(r);
    ok(await avisos(sB) === antes + (nova ? 1 : 0) && await avisos(sL) === 0 && await avisos(sD) >= (nova ? 1 : 0), 'a receita nova vira um aviso na mesa ao vivo: o mestre e o Dalmo o leem; a Lia, não');
    a0 = (await ler(sD, 'medit:achados:pc_selene')).dados;
    ok(a0.achadas.some(x => x.id === r1.id && x.efeito === r1.efeito) && a0.reg[0].tipo === 'tentou' && a0.reg[0].res === r1.id, 'no que a meditação guardou da Selene: a receita e o registro da tentativa');
    ok(await mudar(sB, 'medit:achados:pc_selene', { dados: Object.assign({}, a0, { lib: a0.feitas }) }) === 'ok', 'o mestre corrige o que a meditação guardou');
    {
      const num = x => { try { return JSON.parse(String(x).replace(/^ok /, '')); } catch (e) { return {}; } };
      const mais = num(await medit(sB, 'liberar', { p_pc: 'pc_selene', p_mais: 9 })), menos = num(await medit(sB, 'liberar', { p_pc: 'pc_selene', p_mais: -9 }));
      ok(mais.lib === a0.feitas + 5 && menos.lib === a0.feitas, 'liberar: no máximo 5 à frente, e nunca abaixo das já feitas — ' + JSON.stringify([mais, menos]));
    }
    if (doZero) {
      // o lugar que o banco considera é o que a página mostra: um ambiente que não existe vale como o templo
      ok(await mudar(sB, 'medit:cena', { dados: { v: 1, amb: 'lugar-que-nao-existe', hora: 'meio-dia' } }) === 'ok' && /^ok/.test(await medit(sB, 'liberar', { p_pc: 'pc_selene', p_mais: 1 })), '(o mestre põe na cena um ambiente que não existe, e libera)');
      ok(/"id":"rc_silencio"/.test(await medit(sD, 'tentar', { p_pc: 'pc_selene', p_seq: ['luz', 'sombra'] })), 'a receita só do templo vale, como se fosse o templo (é o que a página mostra)');
      const e = (await ler(sD, 'medit:achados:pc_selene')).dados.reg[0];
      ok(e.amb === 'templo' && e.hora === 'por' && e.clima === '', 'e o registro diz o templo ao pôr do sol — ' + JSON.stringify([e.amb, e.hora, e.clima]));
      await mudar(sB, 'medit:cena', { dados: { v: 1, amb: 'cachoeira', hora: 'noite', clima: 'nevoa' } });
    }
    // o mestre auxiliar: com a aba Meditação, mestra a Meditação; sem ela, é jogador aqui
    ok(/^ok/.test(await rpc(sB, 'definir_auxiliar', { p_mesa: mesa, p_usuario: dalmo, p_auxiliar: true, p_abas: ['meditacao'] })), 'o mestre faz do Dalmo mestre auxiliar só com a aba Meditação');
    ok((await ids(sD)).split(',').includes('medit:receitas') && /^ok/.test(await medit(sD, 'liberar', { p_pc: 'pc_brisa', p_mais: 1 })) && /^ok/.test(await medit(sD, 'entrar', { p_pc: 'npc_monge', p_entrar: true })),
      'com a aba Meditação, ele lê as receitas, libera a tentativa da Brisa e põe o Monge para meditar');
    ok(await ler(sB, 'medit:achados:npc_monge') === null, 'o Monge, sem dono, medita sem registro (não há tentativas para ele)');
    ok(/^ok/.test(await rpc(sB, 'definir_auxiliar', { p_mesa: mesa, p_usuario: dalmo, p_auxiliar: true, p_abas: ['cenas', 'fichas'] })), 'com as Cenas e as Fichas, sem a Meditação');
    ok(!(await ids(sD)).split(',').includes('medit:receitas') && /Só quem mestra a Meditação/.test(await medit(sD, 'liberar', { p_pc: 'pc_brisa', p_mais: 1 })), 'sem a aba Meditação, nem as receitas nem liberar');
    // o dono muda: a prática e o que a meditação guardou vão junto (mesmo quando quem muda não mestra a Meditação)
    ok(await donoDoPc(sD, 'pc_selene', lia) === 'ok', 'o Dalmo, auxiliar com as Fichas, entrega a Selene à Lia');
    {
      const p = await ler(sL, 'medit:pratica:pc_selene'), a = await ler(sL, 'medit:achados:pc_selene');
      ok(!!p && p.dono_id === lia && !!a && a.dono_id === lia && a.dados.achadas.some(x => x.id === r1.id), 'a Lia passa a ler a prática da Selene e o que ela descobriu (agora dela)');
      ok(await mudar(sL, 'medit:pratica:pc_selene', { dados: Object.assign({}, p.dados, { mantra: 'Da Lia agora' }) }) === 'ok' && /^ok/.test(await medit(sL, 'entrar', { p_pc: 'pc_selene', p_entrar: true })), 'e escreve a prática e medita com ela');
    }
    ok(/^ok/.test(await rpc(sB, 'definir_auxiliar', { p_mesa: mesa, p_usuario: dalmo, p_auxiliar: false })), '(o Dalmo volta a ser jogador)');
    ok(!(await ids(sD)).includes('pc_selene') && await mudar(sD, 'medit:pratica:pc_selene', { dados: {} }) === 'nada', 'o Dalmo já não lê nem escreve o que é da Selene');
    ok(await donoDoPc(sB, 'pc_selene', dalmo) === 'ok' && (await ler(sD, 'medit:pratica:pc_selene') || {}).dono_id === dalmo, 'o mestre devolve a Selene ao Dalmo, e a prática volta com ela');
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
    // só o banco: a mesa e os dois jogadores direto pelo banco
    const d = await t.device({ name: 'banco' }); await d.page.goto(t.base + 'src/tests/vazio.html');
    const um = async (email, nome, codigo) => d.page.evaluate(async ([email, senha, nome, codigo]) => {
      const e = await sb.auth.signInWithPassword({ email, password: senha }); if (e.error) return { erro: e.error.message };
      const uid = e.data.user.id;
      if (!codigo) {
        const r = await sb.rpc('criar_mesa', { p_nome: 'Meditação banco ' + Date.now().toString(36), p_meu_nome: nome }); if (r.error) return { erro: r.error.message };
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
  const M = (await t.device({ name: 'mestre', w: 1400, h: 900, seed: { 'tinycats:aba': 'meditacao', 'tinycats-tour': '1' } })).page;
  const Dp = (await t.device({ name: 'dalmo', w: 1300, h: 860, seed: { 'tinycats:aba': 'meditacao', 'tinycats-tour': '1' } })).page;
  const Lp = (await t.device({ name: 'lia', w: 1300, h: 860, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 80) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const abas = p => p.evaluate(() => [...document.querySelectorAll('.tab')].filter(x => !x.hidden).map(x => x.id.slice(4)).join(','));
  const docDe = (p, id) => p.evaluate(id => { const l = TC.dados.col('documentos').pegar(id); return l && !l.apagado ? JSON.parse(JSON.stringify(l.dados)) : null; }, id);
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const pronta = (f, mestre) => f.evaluate(m => !!window.__medit && __medit.pronto && __medit.naMesa && __medit.mestre === m, mestre);
  const docF = (f, id) => f.evaluate(id => __medit.doc(id), id);
  const feed = p => p.evaluate(() => [...document.querySelectorAll('#feed .it')].map(x => x.textContent.replace(/\s+/g, ' ')).join(' ¶ '));
  async function escrever(f, k, v) { const el = f.locator(`[data-k="${k}"]`); await el.fill(v); await el.dispatchEvent('change'); await f.waitForTimeout(200); }
  async function botao(f, sel) { await f.locator(sel).click(); await f.waitForTimeout(250); }
  const foto = async (p, nome) => { if (process.env.FOTOS) await p.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Meditação E2E ' + Date.now().toString(36);
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
    ok(await abas(M) === 'jornal,cenas,mundo,acampamento,fichas,arvore,meditacao,cla,rolador' && await abas(Dp) === 'jornal,cenas,mundo,acampamento,fichas,arvore,meditacao,cla',
      'a aba Meditação, depois da Árvore: para o mestre e para os jogadores — ' + await abas(Dp));
    await M.evaluate(([d, l, fs, fb, fm]) => {
      const P = TC.dados.col('personagens');
      P.gravar('pc_selene', { nome: 'Selene', ficha: fs, skills: {}, estado: {}, dono_id: d, vis: 'mesa', ordem: 0 });
      P.gravar('pc_brisa', { nome: 'Brisa', ficha: fb, skills: {}, estado: {}, dono_id: l, vis: 'mesa', ordem: 1 });
      P.gravar('npc_monge', { nome: 'Monge', ficha: fm, skills: {}, estado: {}, vis: 'mesa', ordem: 2 });
    }, [dalmo, lia, ficha('Selene'), ficha('Brisa'), ficha('Monge')]);
    ok(await ate(() => parado(M)), '(as fichas da Selene, do Dalmo, da Brisa, da Lia, e do Monge, sem dono, sobem para a mesa)');

    // ---------- o mestre monta o lugar e as receitas ----------
    let MM = null;
    ok(await ate(async () => { MM = await quadro(M, /\/meditacao\//); return MM && await pronta(MM, true); }, 40000), '(na mesa, o mestre abre a Meditação como quem mestra)');
    await botao(MM, '[data-amb="cachoeira"]'); await botao(MM, '[data-hora="noite"]');
    await MM.locator('[data-k="c:clima"]').selectOption('nevoa'); await w(300);
    ok(await ate(async () => { const x = await docDe(M, 'medit:cena'); return !!x && x.amb === 'cachoeira' && x.hora === 'noite' && x.clima === 'nevoa' && await parado(M); }), 'o lugar vai para a mesa: a cachoeira, à noite, com névoa');
    await botao(MM, '[data-vista="receitas"]');
    const pilar = async (grupo, s) => { await botao(MM, `[data-k="grupos-rc"] [data-grupo="${grupo}"]`); await botao(MM, `[data-rsimb="${s}"]`); };
    await botao(MM, '[data-k="rc:nova"]'); await escrever(MM, 'rc:nome', 'Chama do Primeiro Sol');
    await pilar('as', 'sol'); await pilar('el', 'fogo'); await pilar('an', 'dragao');
    await escrever(MM, 'rc:efeito', 'O calor do primeiro sol percorre o corpo.');
    await botao(MM, '[data-k="rc:nova"]'); await escrever(MM, 'rc:nome', 'Maré');
    await pilar('as', 'lua'); await pilar('el', 'agua');
    await MM.locator('[data-k="rc:quem-alguns"]').check(); await w(300);
    ok(await ate(async () => { const r = await docDe(M, 'medit:receitas'); return !!r && r.lista.length === 2 && r.lista[0].seq.join() === 'sol,fogo,dragao' && JSON.stringify(r.lista[1].quem) === '["pc_brisa"]' && await parado(M); }),
      'as receitas vão para a mesa: a Chama do Primeiro Sol, para todos, e a Maré, só para a Brisa');
    await botao(MM, '[data-vista="cena"]');

    // ---------- o Dalmo: o lugar, sem as receitas; a prática da Selene ----------
    let MD = null;
    ok(await ate(async () => { MD = await quadro(Dp, /\/meditacao\//); return MD && await pronta(MD, false); }, 40000), '(o Dalmo abre a Meditação, como jogador)');
    ok(await ate(async () => (await MD.locator('[data-k="ch:amb"]').innerText()) === 'Cachoeira' && (await MD.locator('[data-k="ch:hora"]').innerText()) === 'Noite' && (await MD.locator('[data-k="ch:clima"]').innerText()) === 'Névoa'),
      'o Dalmo vê o lugar que o mestre montou');
    ok(await MD.locator('#vistas').count() === 0 && await MD.locator('#ambientes').isHidden() && await docF(MD, 'medit:receitas') === null && await docF(MD, 'medit:treino') === null,
      'sem as receitas (nem chegam ao aparelho dele), sem o treinamento e sem os ambientes');
    ok(/A prática de Selene/.test(await MD.locator('#painel').innerText()) && await MD.locator('[data-k="meditar"]').isVisible() && await MD.locator('[data-k="tentar"]').isDisabled()
      && /Entre na meditação/.test(await MD.locator('[data-k="tentar"]').innerText()), 'o painel dele: a prática da Selene, "Meditar", e os pilares esperando');
    await escrever(MD, 'p:objeto', 'Um colar de dentes de lobo');
    await escrever(MD, 'p:mantra', 'A lua não tem pressa, e ainda assim chega.');
    await escrever(MD, 'p:panteao', 'Os Deuses da Lua');
    ok(await ate(async () => { const p = await docDe(M, 'medit:pratica:pc_selene'); return !!p && p.objeto === 'Um colar de dentes de lobo' && p.mantra === 'A lua não tem pressa, e ainda assim chega.'; }),
      'a prática chega ao mestre');
    ok(await ate(() => M.evaluate(() => { const l = TC.dados.col('personagens').pegar('pc_selene'); return !!l && l.ficha.panteao === 'Os Deuses da Lua'; })), 'o panteão é o da ficha: a ficha da Selene muda');
    {
      const [fc] = await Promise.all([MD.page().waitForEvent('filechooser'), MD.locator('[data-k="p:img"]').click()]); await fc.setFiles(PNG);
      ok(await ate(() => M.evaluate(() => { const l = TC.dados.col('personagens').pegar('pc_selene'); return !!l && /^https:\/\/.+\.(webp|png)$/.test(l.ficha.imgMed || ''); })) && !(await docF(MD, 'medit:pratica:pc_selene')).img,
        'a imagem meditando é enviada à mesa e fica na ficha da Selene (em WebP ou PNG, com a transparência), não na prática');
    }

    // ---------- o Dalmo medita: o mestre e a Lia veem ----------
    await botao(MD, '[data-k="meditar"]');
    ok(await ate(async () => JSON.stringify((await docF(MD, 'medit:quem') || {}).quem) === '["pc_selene"]' && await MD.locator('[data-k="sair"]').isVisible()), 'o Dalmo põe a Selene para meditar ("Sair da meditação")');
    ok(await ate(async () => (await MM.locator('[data-quem="pc_selene"]').count()) === 1 && (await MM.locator('.quem.fig[data-pc="pc_selene"] .fig-img').count()) === 1), 'o mestre vê a Selene meditando: o cartão e a cena (a figura grande, com a imagem meditando)');
    await Lp.locator('#tab-meditacao').click();
    let ML = null;
    ok(await ate(async () => { ML = await quadro(Lp, /\/meditacao\//); return ML && await pronta(ML, false); }, 40000), '(a Lia abre a Meditação)');
    ok(await ate(async () => (await ML.locator('div.quem[data-pc="pc_selene"]').count()) === 1), 'a Lia vê a Selene meditando');
    ok(await ate(async () => (await ML.locator('div.quem.fig[data-pc="pc_selene"] .fig-img').count()) === 1) && await docF(ML, 'medit:pratica:pc_selene') === null && await docF(ML, 'medit:achados:pc_selene') === null && /A prática de Brisa/.test(await ML.locator('#painel').innerText()),
      '(lote 7) com a imagem meditando, que agora é de todos — mas sem a prática (nem chega a ela); o painel dela é o da Brisa');

    // ---------- as tentativas ----------
    const poe = async (grupo, s) => { await botao(MD, `[data-k="grupos"] [data-grupo="${grupo}"]`); await botao(MD, `[data-simb="${s}"]`); };
    const liberar = async () => { await botao(MM, '[data-k="lib:pc_selene"]'); return ate(async () => /O mestre liberou 1 tentativa/.test(await MD.locator('[data-k="tent"]').innerText())); };
    ok(/Só quem mestra a Meditação libera a tentativa/.test(await MD.evaluate(() => TC.ponte.meditacao('liberar', { pc: 'pc_selene', mais: 1 }).then(() => 'liberou', e => e.message))),
      'o jogador pedindo ao banco para liberar a própria tentativa: a recusa chega com a explicação do banco');
    ok(await liberar(), 'o mestre libera a tentativa: o Dalmo vê "O mestre liberou 1 tentativa"');
    await poe('as', 'sol'); await poe('el', 'fogo'); await poe('an', 'corvo'); await botao(MD, '[data-k="tentar"]');
    ok(await ate(async () => /Nada aconteceu\./.test(await MD.locator('[data-k="res"]').innerText())), 'o Dalmo erra: "Nada aconteceu."');
    ok(await ate(async () => /Última tentativa: Sol → Fogo → Corvo · nada aconteceu/.test(await MM.locator('[data-quem="pc_selene"]').innerText())), 'o mestre vê a tentativa no cartão da Selene');
    ok(await liberar(), '(o mestre libera outra)');
    await poe('as', 'lua'); await poe('el', 'agua'); await botao(MD, '[data-k="tentar"]');
    ok(await ate(async () => /Nada aconteceu\./.test(await MD.locator('[data-k="res"]').innerText()) && /Lua → Água/.test(await MD.locator('[data-k="res"]').innerText())), 'a Maré é só da Brisa: para a Selene, nada');
    ok(await liberar(), '(e outra)');
    await poe('as', 'sol'); await poe('el', 'fogo'); await poe('an', 'dragao'); await botao(MD, '[data-k="tentar"]');
    ok(await ate(async () => /Você descobriu: Chama do Primeiro Sol/.test(await MD.locator('[data-k="res"]').innerText()) && /O calor do primeiro sol percorre o corpo\./.test(await MD.locator('[data-k="res"]').innerText())),
      'o Dalmo acerta: "Você descobriu: Chama do Primeiro Sol", com o efeito');
    ok(await ate(async () => (await MD.locator('[data-achada="' + (await docDe(M, 'medit:receitas')).lista[0].id + '"]').count()) === 1), 'a receita entra em "Receitas descobertas" dele');
    ok(await ate(async () => /Receita descoberta: Chama do Primeiro Sol/.test(await feed(Dp)) && /Só você e o mestre veem/.test(await feed(Dp))), 'na mesa ao vivo do Dalmo, o aviso — "Só você e o mestre veem"');
    ok(await ate(async () => /Receita descoberta: Chama do Primeiro Sol/.test(await feed(M)) && /Selene descobriu esta receita nos pilares/.test(await feed(M)) && /Só você e Dalmo veem/.test(await feed(M))
      && await M.evaluate(() => [...document.querySelectorAll('#feed .it .or')].some(x => x.textContent === 'Meditação'))), 'na do mestre também — "Só você e Dalmo veem" (com a marca "Meditação")');
    await w(1500, Lp);
    ok(!/Receita descoberta/.test(await feed(Lp)), 'a Lia não recebe o aviso');
    {
      // (lote 7) o mestre limpa o registro da Selene: as receitas e as tentativas ficam
      const antes = await docDe(M, 'medit:achados:pc_selene');
      ok(await MD.locator('.reg').count() >= 4 && await MD.locator('[data-k="reg:limpar"]').count() === 0, 'o Dalmo vê o registro da Selene, mas sem "Limpar o registro" (é de quem mestra)');
      if (await MM.evaluate(() => __medit.sel) !== 'pc_selene') await MM.locator('[data-k="m:pc"]').selectOption('pc_selene');
      await botao(MM, '[data-k="reg:limpar"]'); await botao(MM, '#dlg [data-k="dl:sim"]');
      ok(antes.reg.length >= 4 && await ate(async () => { const a = await docF(MD, 'medit:achados:pc_selene'); return !!a && a.reg.length === 0 && a.achadas.length === antes.achadas.length && a.lib === antes.lib && a.feitas === antes.feitas; })
        && await ate(async () => /Nenhuma meditação ainda/.test(await MD.locator('#painel').innerText())), 'o mestre limpa o registro da Selene: o do Dalmo esvazia junto; as receitas e as tentativas ficam');
      await botao(MM, '#btDesfazer');
      ok(await ate(async () => (await docF(MD, 'medit:achados:pc_selene')).reg.length === antes.reg.length), 'e desfaz: o registro volta');
    }
    await foto(Dp, 'meditacao-rede-dalmo'); await foto(M, 'meditacao-rede-mestre');

    // ---------- tirar e desfazer; a Brisa; o treinamento ----------
    await botao(MM, '[data-k="sair:pc_selene"]');
    ok(await ate(async () => (await docF(MD, 'medit:quem')).quem.length === 0 && await MD.locator('[data-k="meditar"]').isVisible()), 'o mestre tira a Selene da meditação: o Dalmo volta a ver "Meditar"');
    await botao(MM, '#btDesfazer');
    ok(await ate(async () => JSON.stringify((await docF(MD, 'medit:quem')).quem) === '["pc_selene"]'), 'o mestre desfaz: a Selene volta a meditar');
    {
      // quando a resposta do banco chega ao sistema, quem medita (e o registro) já chegou junto: a tela não pisca
      const ja = entrar => MD.evaluate(async e => { await TC.ponte.meditacao('entrar', { pc: 'pc_selene', entrar: e }); const q = __medit.doc('medit:quem'); return JSON.stringify(q && q.quem); }, entrar);
      ok(await ja(false) === '[]' && await ja(true) === '["pc_selene"]', 'sair e entrar de novo: quando a resposta chega, a lista de quem medita já está atualizada');
    }
    await botao(ML, '[data-k="meditar"]');
    ok(await ate(async () => (await MM.locator('[data-quem]').count()) === 2 && (await MM.locator('.quem').count()) === 2), 'a Lia põe a Brisa para meditar: o mestre vê as duas');
    await botao(MM, '[data-k="ver:pc_selene"]');
    await MM.locator('[data-k="tb:nome"]').fill('Controle do chi'); await botao(MM, '[data-k="tb:nova"]');
    ok(await ate(async () => { const x = await docDe(M, 'medit:treino'); return !!x && x.pcs.pc_selene && x.pcs.pc_selene[0].nome === 'Controle do chi' && await parado(M); }), 'o mestre cria uma barra de treinamento para a Selene');
    await w(1500, Dp);
    ok(await docF(MD, 'medit:treino') === null, 'e ela não chega ao Dalmo');

    // ---------- a Selene passa para a Lia ----------
    await M.evaluate(l => TC.dados.col('personagens').gravar('pc_selene', { dono_id: l }), lia);
    ok(await ate(async () => (await ML.locator('[data-k="j:pc"] option').count()) === 2, 40000), 'o mestre entrega a Selene à Lia: ela passa a escolher entre a Brisa e a Selene');
    await ML.locator('[data-k="j:pc"]').selectOption('pc_selene'); await w(300, Lp);
    ok(await ate(async () => await ML.locator('[data-k="p:objeto"]').inputValue() === 'Um colar de dentes de lobo' && (await ML.locator('[data-achada]').count()) === 1, 40000),
      'com a prática que o Dalmo escreveu e a receita que a Selene descobriu');
    ok(await ate(async () => /Você ainda não tem personagem nesta mesa/.test(await MD.locator('#painel').innerText()), 40000), 'o Dalmo fica sem personagem na Meditação');
    await M.evaluate(d => TC.dados.col('personagens').gravar('pc_selene', { dono_id: d }), dalmo);
    ok(await ate(async () => /A prática de Selene/.test(await MD.locator('#painel').innerText()), 40000), '(o mestre devolve a Selene ao Dalmo)');

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
