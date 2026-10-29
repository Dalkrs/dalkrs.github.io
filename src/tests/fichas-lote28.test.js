// Fichas, lote 28 (sem mesa): equipar uma árvore cria a barra especial dela na ficha. (Desde o lote 34, a raça, a classe e a
// linhagem trazem barra comum — ver fichas-lote34 —: aqui as árvores são da categoria "outra", que ainda traz a especial.)
//   · o nome, o limite e o começo lidos do texto da árvore ("Fúria (barra): máximo 10; começa em 0."), com o aviso e o
//     Desfazer; a barra que saiu não volta sozinha (só se a árvore sair e entrar de novo);
//   · sem o limite no texto (uma balança, "de −5 a +5"), a barra nasce sem limite, o aviso diz, e o campo Limite fica
//     marcado até alguém pôr um;
//   · a ficha que já tem uma barra com o mesmo nome fica com a dela; a ficha que já existia (com a árvore equipada antes
//     desta versão) não ganha barra de surpresa; a árvore equipada por fora (na Árvore) cria a barra quando a ficha abre.
// + as contas (tc/rules.js): defBarraEspecial.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const j = JSON.stringify;
// ---------- as contas ----------
const def = d => R.defBarraEspecial({ nodes: [{ pais: [], desc: d }] });
ok(j(def('O bárbaro…\n\nFúria (barra): máximo 10; começa em 0.')) === j({ nome: 'Fúria', max: 10, inicio: 0, faixa: null }), 'Fúria: máximo 10, começa em 0');
ok(j(def('x\n\nGeada: máximo 20; começa com 4.')) === j({ nome: 'Geada', max: 20, inicio: 4, faixa: null }), 'Geada: máximo 20, começa com 4');
ok(j(def('x\n\nCargas: de 0 a 6.')) === j({ nome: 'Cargas', max: 6, inicio: null, faixa: null }), 'Cargas: de 0 a 6 é o máximo 6 (começa cheia)');
ok(j(def('x\n\nVoz: de −5 a +5.')) === j({ nome: 'Voz', max: null, inicio: null, faixa: 'de −5 a +5' }) && def('x\n\nEquilíbrio: uma balança entre a luz e a sombra.').faixa === 'balança', 'a balança e o "de −5 a +5": sem limite (a ficha não guarda o negativo)');
ok(j(R.defBarraEspecial({ barra: 'Dívida', nodes: [{ pais: [], desc: 'Pacto: …' }] })) === j({ nome: 'Dívida', max: null, inicio: null, faixa: null }) && def('Sem barra nenhuma.') === null, 'o nome escrito pelo mestre (sem limite no texto); a árvore sem barra: nada');

const no = (id, nome, pais, desc) => ({ id, nome, tipo: pais.length ? 'notavel' : 'keystone', pais, usos: [], desc, graus: [{ custos: pais.length ? { p1: 1 } : {}, texto: '' }] });
const bib = { nome: 'Bib', pools: [{ id: 'p1', nome: 'Pontos', cor: '#D9A441', padrao: 10 }], usos: [], naturezas: [],
  arvores: [
    { id: 'a_barb', nome: 'Bárbaro', categoria: 'outra', nodes: [no('b1', 'Sangue quente', [], 'O bárbaro vive da raiva.\n\nFúria (barra): máximo 10; começa em 0.'), no('b2', 'Golpe brutal', ['b1'], 'Gasta 2 de Fúria.')] },
    { id: 'a_selene', nome: 'Kitsune Selene', categoria: 'outra', nodes: [no('s1', 'Luar', [], 'x\n\nGeada: máximo 20; começa com 4.')] },
    { id: 'a_voz', nome: 'Konaito', categoria: 'outra', nodes: [no('v1', 'A voz', [], 'x\n\nVoz: de −5 a +5.')] },
    { id: 'a_nada', nome: 'Escriba', categoria: 'outra', nodes: [no('e1', 'Pena', [], 'Escreve bonito.')] }] };
const pc = (id, nome, extra) => Object.assign(R.personagemPadrao(nome), { id, nome, level: 8, recursos: [{ id: 'hp' + id, nome: 'HP', fml: '100' }] }, extra);
const dain = pc('pc_dain', 'Dain', { arvVistas: [], skills: { arvores: [], pontos: { p1: 10 }, alocados: {} } });
const lia = pc('pc_lia', 'Lia', { arvVistas: [], poderes: [{ id: 'pg', nome: 'Geada', max: 12, atual: 5 }], skills: { arvores: [], pontos: { p1: 10 }, alocados: {} } });
const kai = pc('pc_kai', 'Kai', { skills: { arvores: ['a_barb'], pontos: { p1: 10 }, alocados: {} } });      // (de antes desta versão: sem arvVistas)
const estado = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [dain, lia, kai], situacoes: [], tabelas: [], log: [], bib, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: [], skillsUI: { equipar: true, distribuir: true } });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'fichas-l28', w: 1300, h: 900, seed: { urgm_calc_atributos_v1: estado } });
  const w = ms => P.waitForTimeout(ms);
  const foto = async nome => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await P.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png'), fullPage: true }); } };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const ficha = id => P.evaluate(id => { const p = S.personagens.find(x => x.id === id); return { pd: (p.poderes || []).map(x => ({ id: x.id, nome: x.nome, max: x.max, inicio: x.inicio, sem: !!x.semLimite })), est: (p.estado && p.estado.pd) || {}, vistas: p.arvVistas }; }, id);
  const abrir = async id => { await P.evaluate(id => { S.sel = id; render(); }, id); await w(300); await P.locator('#ficha [data-abaficha="skills"]').click(); await w(300); };
  const equipar = async (arv, on) => { const c = P.locator('[data-skarv="' + arv + '"]'); if ((await c.isChecked()) !== on) await c.click(); await w(400); };
  const aviso = () => P.evaluate(() => [...document.querySelectorAll('.toast')].map(x => x.innerText).join(' ¶ '));
  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1200);
  await abrir('pc_dain');

  await passo('equipar o Bárbaro', async () => {
    await equipar('a_barb', true);
    const f = await ficha('pc_dain'), a = await aviso();
    ok(j(f.pd) === j([{ id: 'pa_a_barb', nome: 'Fúria', max: 10, inicio: 0, sem: false }]) && f.est.pa_a_barb === 0, 'equipar o Bárbaro cria a Fúria: máximo 10, começa em 0 (e está em 0) — ' + j(f));
    ok(/A árvore Bárbaro trouxe a barra especial Fúria \(máximo 10, começa em 0\)\./.test(a) && /Desfazer/.test(a), 'o aviso diz o que veio, com Desfazer — ' + a);
    await P.locator('.toast button', { hasText: 'Desfazer' }).click(); await w(400);
    ok((await ficha('pc_dain')).pd.length === 0, 'o Desfazer tira a barra');
    await P.evaluate(() => render()); await w(300);
    ok((await ficha('pc_dain')).pd.length === 0, 'e ela não volta sozinha (a ficha lembra que a árvore já estava)');
    await equipar('a_barb', false); await equipar('a_barb', true);
    ok((await ficha('pc_dain')).pd.map(x => x.nome).join() === 'Fúria', 'tirar a árvore e equipar de novo traz a barra de novo');
  });
  await passo('sem limite', async () => {
    await equipar('a_voz', true);
    const f = await ficha('pc_dain'), a = await aviso();
    ok(j(f.pd.find(x => x.nome === 'Voz')) === j({ id: 'pa_a_voz', nome: 'Voz', max: 0, sem: true }), 'a Voz (de −5 a +5) nasce sem limite — ' + j(f.pd));
    ok(/A árvore Konaito trouxe a barra especial Voz, sem limite: o texto diz que vai de −5 a \+5\. Ponha o limite à mão/.test(a), 'o aviso diz por quê e pede o limite à mão — ' + a);
    await P.locator('#ficha [data-abaficha="atributos"]').click(); await w(300);
    ok(await P.locator('[data-pdmax="pa_a_voz"].pdfalta').count() === 1 && await P.locator('[data-pdmax="pa_a_barb"].pdfalta').count() === 0, 'o campo Limite da Voz fica marcado (o da Fúria, não)');
    await foto('l28-fichas-barras');
    await P.locator('[data-pdmax="pa_a_voz"]').fill('5'); await P.locator('[data-pdmax="pa_a_voz"]').press('Tab'); await w(400);
    const g = await ficha('pc_dain');
    ok(g.pd.find(x => x.nome === 'Voz').max === 5 && !g.pd.find(x => x.nome === 'Voz').sem && await P.locator('[data-pdmax="pa_a_voz"].pdfalta').count() === 0, 'pôr o limite tira a marca');
    await equipar_('a_nada');
    async function equipar_(arv) { await P.locator('#ficha [data-abaficha="skills"]').click(); await w(300); await equipar(arv, true); }
    ok((await ficha('pc_dain')).pd.length === 2, 'a árvore sem barra (Escriba) não cria nada');
  });
  await passo('mesmo nome', async () => {
    await abrir('pc_lia');
    await equipar('a_selene', true);
    const f = await ficha('pc_lia');
    ok(j(f.pd) === j([{ id: 'pg', nome: 'Geada', max: 12, sem: false }]), 'a Lia já tinha a Geada: fica a dela (máximo 12), sem outra igual — ' + j(f.pd));
  });
  await passo('a ficha de antes', async () => {
    await abrir('pc_kai');
    const f = await ficha('pc_kai');
    ok(f.pd.length === 0 && j(f.vistas) === j(['a_barb']), 'a ficha de antes (o Bárbaro já estava equipado): nenhuma barra de surpresa; a ficha anota a árvore que já tinha — ' + j(f));
    // a árvore equipada por fora (como na aba Árvore): a barra vem quando a ficha abre
    await P.evaluate(() => { const p = S.personagens.find(x => x.id === 'pc_kai'); p.skills.arvores.push('a_selene'); render(); }); await w(400);
    const g = await ficha('pc_kai');
    ok(g.pd.map(x => x.nome + ':' + x.max + ':' + x.inicio).join() === 'Geada:20:4' && g.est[g.pd[0].id] === 4 && /A árvore Kitsune Selene trouxe a barra especial Geada \(máximo 20, começa em 4\)/.test(await aviso()), 'a Kitsune equipada por fora traz a Geada (máximo 20, começa em 4) quando a ficha abre');
  });
  await t.close();
  end();
})();
