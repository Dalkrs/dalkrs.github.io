// Bloco de notas, lote 124: a auditoria da administração, sem rede (o módulo tc/notas.js com uma mesa de mentira).
//   · auditando (nos dois modos), os cadernos são "Do mestre", "Do grupo" e "Dos jogadores", e nada é editável;
//   · "Dos jogadores" tem os auxiliares e o próprio administrador, se ele também participa da mesa;
//   · os capítulos apagados aparecem riscados e no fim: os que quem mestra apagou (vêm de dados.notasApagadas) e os
//     que quem joga marcou (com o texto, daqui em diante);
//   · fora da auditoria, nada muda: o jogador não vê o apagado, e a marca de apagar guarda o texto junto.
const { start, checker } = require('./lib');
const { ok, end } = checker();
(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'notas124', w: 1300, h: 850 });
  const w = ms => P.waitForTimeout(ms);
  const E = (fn, a) => P.evaluate(fn, a);
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  await P.goto(t.base + 'versao.json'); await w(100);
  // monta o bloco com uma mesa de mentira: modo 'aud' ('ver' | 'mestre' | null), quem sou eu e o cargo
  await E(() => {
    window.__montar = (modo, eu, cargo) => {
      document.body.innerHTML = '<button id="bt">Notas</button><aside id="painel" hidden style="width:420px;height:700px;display:flex;flex-direction:column"></aside>';
      const ouv = {}, emit = (ev, ...a) => (ouv[ev] || []).forEach(f => f(...a));
      const docs = new Map();
      const pus = (id, dono, dados) => docs.set(id, { id, dono_id: dono, apagado: false, rev: 1, dados });
      pus('notas:m1', null, { v: 1, t: 'Segredos do vilão', tags: ['plano'], html: '<p>O duque é o traidor.</p>', ord: 1 });
      pus('notasj:j1:a', 'j1', { v: 1, t: 'Suspeitas', tags: [], html: '<p>Não confio no ferreiro.</p>', ord: 1 });
      pus('notasj:j1:b', 'j1', { v: 1, t: 'Rascunho apagado', tags: [], html: '<p>Vou roubar o grupo.</p>', ord: 2, apagada: true, em: Date.parse('2026-11-08T20:00:00Z') });
      pus('notasj:j1:c', 'j1', { v: 1, apagada: true, em: 1 });                       // apagado antes do lote 124: sem o texto
      pus('notasj:aux:a', 'aux', { v: 1, t: 'Do auxiliar', tags: [], html: '<p>oi</p>', ord: 1 });
      pus('notasg:g1', 'j1', { v: 1, t: 'Pistas do grupo', tags: [], html: '<p>A chave está no poço.</p>', ord: 1 });
      window.__docs = docs; window.__grav = [];
      const dados = { on: (ev, f) => (ouv[ev] = ouv[ev] || []).push(f),
        notasApagadas: () => Promise.resolve(modo ? [{ id: 'notas:m0', dono_id: null, atualizado_em: '2026-11-07T15:00:00Z', dados: { v: 1, t: 'Final secreto', tags: [], html: '<p>O mundo acaba.</p>', ord: 0 } }] : []),
        col: () => ({ pronta: Promise.resolve(), todas: () => [...docs.values()], pegar: id => docs.get(id) || null,
          gravar: (id, c) => { window.__grav.push([id, c]); docs.set(id, Object.assign({ id }, docs.get(id) || {}, c)); emit('muda', 'documentos', docs.get(id), 'local'); },
          apagar: id => { window.__grav.push([id, 'apagar']); docs.delete(id); } }) };
      const membros = [{ usuario_id: 'mestre', nome: 'Bruno', cargo: 'mestre' }, { usuario_id: 'j1', nome: 'Ana', cargo: 'jogador' }, { usuario_id: 'aux', nome: 'Dalmo', cargo: 'auxiliar' }];
      const mesas = { atual: { id: 'm1', cargo, auditoria: modo, campanhas: [], membros }, on: () => {}, campanha: () => null };
      window.__api = TC.notas.iniciar({ mesas, dados, toast: m => (window.__toast = m), confirmar: (a, b, c, f) => f(), botao: document.getElementById('bt'), painel: document.getElementById('painel'),
        guarda: { ler: () => null, gravar: () => {} }, eu: () => eu, ir: () => {}, indice: () => Promise.resolve([]), buscar: () => [] });
      window.__api.abrir(true);
    };
  });
  await P.addStyleTag({ content: '[hidden]{display:none!important}' });
  await P.addScriptTag({ url: t.base + 'tc/busca.js' });
  await P.addScriptTag({ url: t.base + 'tc/notas.js' });
  const cads = () => E(() => [...document.querySelectorAll('.nt-cad')].map(b => b.textContent));
  const lista = () => E(() => [...document.querySelectorAll('.nt-cap')].map(b => (b.classList.contains('apag') ? '~' : '') + b.querySelector('b').textContent));
  const cad = async k => { await P.locator('.nt-cad[data-cad="' + k + '"]').click(); await w(150); };
  const cap = async t => { await P.locator('.nt-cap', { hasText: t }).first().click(); await w(150); };

  for (const modo of ['ver', 'mestre']) await passo('auditoria (' + modo + ')', async () => {
    // o administrador também participa da mesa, como auxiliar ("aux"): é o caso da mesa Novo RPG
    await E(m => window.__montar(m, 'aux', 'mestre'), modo); await w(250);
    ok(JSON.stringify(await cads()) === JSON.stringify(['Do mestre', 'Do grupo', 'Dos jogadores']), modo + ': os três cadernos com os nomes da auditoria: ' + JSON.stringify(await cads()));
    ok(/auditoria · só leitura/.test(await E(() => document.getElementById('nt-so').textContent)), modo + ': o aviso diz que é só leitura');
    ok(JSON.stringify(await lista()) === JSON.stringify(['Segredos do vilão', '~Final secreto']), modo + ': do mestre, o capítulo e o apagado (riscado, no fim): ' + JSON.stringify(await lista()));
    ok(!(await E(() => document.getElementById('nt-novo'))) && !(await E(() => document.getElementById('nt-apagar'))), modo + ': sem "+ Capítulo" e sem "Apagar"');
    ok(await E(() => document.getElementById('nt-texto').getAttribute('contenteditable')) === 'false' && await E(() => document.getElementById('nt-tit').readOnly), modo + ': o texto e o título não se editam');
    await cap('Final secreto');
    ok(/Capítulo apagado em 07\/11\/2026/.test(await E(() => (document.getElementById('nt-apag') || {}).textContent || '')) && /O mundo acaba/.test(await E(() => document.getElementById('nt-texto').textContent)), modo + ': o apagado mostra quando e o texto');
    await cad('grupo');
    ok(JSON.stringify(await lista()) === JSON.stringify(['Pistas do grupo']), modo + ': o caderno do grupo');
    await cad('jog');
    const ops = await E(() => [...document.querySelectorAll('#nt-jog option')].map(o => o.textContent));
    ok(JSON.stringify(ops) === JSON.stringify(['Ana', 'Dalmo (auxiliar) (você)']), modo + ': os jogadores, com o auxiliar e o próprio administrador: ' + JSON.stringify(ops));
    await P.selectOption('#nt-jog', 'j1'); await w(150);
    ok(JSON.stringify(await lista()) === JSON.stringify(['Suspeitas', '~Sem título', '~Rascunho apagado']), modo + ': o caderno da Ana, com os dois apagados: ' + JSON.stringify(await lista()));
    await cap('Rascunho apagado');
    ok(/apagado por quem escreveu em 08\/11\/2026/.test(await E(() => document.getElementById('nt-apag').textContent)) && /roubar o grupo/.test(await E(() => document.getElementById('nt-texto').textContent)), modo + ': o apagado pela Ana, com o texto');
    await cap('Sem título');
    ok(/não há o que mostrar/.test(await E(() => document.getElementById('nt-apag').textContent)), modo + ': o apagado antigo avisa que o texto não foi guardado');
    await P.selectOption('#nt-jog', 'aux'); await w(150);
    ok(JSON.stringify(await lista()) === JSON.stringify(['Do auxiliar']), modo + ': o caderno do próprio administrador');
    // tentar escrever não grava nada
    await E(() => { const ed = document.getElementById('nt-texto'); ed.innerHTML = '<p>mexi</p>'; ed.dispatchEvent(new Event('input')); ed.dispatchEvent(new Event('blur')); }); await w(900);
    ok(await E(() => window.__grav.length) === 0, modo + ': nada foi gravado');
  });

  await passo('fora da auditoria', async () => {
    // o mestre de verdade: "Meu caderno", o apagado do banco não aparece, os apagados da Ana não aparecem
    await E(() => window.__montar(null, 'mestre', 'mestre')); await w(250);
    ok(JSON.stringify(await cads()) === JSON.stringify(['Meu caderno', 'Do grupo', 'Dos jogadores']), 'o mestre: os nomes de sempre');
    ok(JSON.stringify(await lista()) === JSON.stringify(['Segredos do vilão']), 'o mestre não vê o capítulo apagado');
    await cad('jog'); await P.selectOption('#nt-jog', 'j1'); await w(150);
    ok(JSON.stringify(await lista()) === JSON.stringify(['Suspeitas']), 'nem os apagados da Ana');
    // a Ana apaga: a marca guarda o texto junto
    await E(() => window.__montar(null, 'j1', 'jogador')); await w(250);
    ok(JSON.stringify(await lista()) === JSON.stringify(['Suspeitas']), 'a Ana vê só o que não apagou');
    await P.locator('#nt-apagar').click(); await w(200);
    const d = await E(() => window.__docs.get('notasj:j1:a').dados);
    ok(d.apagada === true && /Não confio no ferreiro/.test(d.html) && d.t === 'Suspeitas', 'apagar marca e guarda o texto: ' + JSON.stringify(d));
    ok(JSON.stringify(await lista()) === JSON.stringify([]), 'e o capítulo some da lista dela');
  });

  if (t.errs.length) console.log(t.errs.slice(0, 10).join('\n'));
  ok(t.errs.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
