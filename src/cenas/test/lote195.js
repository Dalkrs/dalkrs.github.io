// (lote 195) O Ninja do Arremesso: as condições das agulhas, a escolha "num ponto" na janela, o acúmulo (Agulhas no
// Corpo, até 3) que sugere o Corpo Travado, e o Fluxo (Agulha no Fluxo: metade da barra; Fluxo Selado: nada).
const { open } = require('./lib');
(async () => {
  const t = await open(); const { page } = t; const ev = (fn, a) => page.evaluate(fn, a); const w = ms => page.waitForTimeout(ms);
  let ok = 0, fail = 0; const chk = (c, m) => { if (c) ok++; else { fail++; console.log('FALHOU: ' + m); } };
  const j = JSON.stringify;
  chk(await ev(() => ['agulhaPerna', 'agulhaBraco', 'agulhaOlhos', 'agulhaFluxo', 'agulhaCura', 'agulhas', 'corpoTravado', 'reflexoTravado', 'fluxoSelado'].every(id => __tc.COND_BY_ID[id] && __tc.COND_BY_ID[id].r === 'Ninja')), 'as 9 condições do Ninja existem');
  const ids = await ev(() => { const { Store, newToken } = __tc, sc = Store.scene(); const a = newToken(sc, 6 * sc.cell, 6 * sc.cell, { name: 'Shinobi' }), b = newToken(sc, 9 * sc.cell, 6 * sc.cell, { name: 'Alvo' }); Store.tx('Criar', () => { Store.add('tokens', a); Store.add('tokens', b); }); return [a.id, b.id]; });
  const tok = id => ev(id => { const t = __tc.Store.get('tokens', id); return { conds: t.conds, ci: t.cinfo }; }, id);
  const jan = await ev(() => { const sp = __tc.HabAcao.specDe({ id: 'n_ninja_bcab', grau: 2 }); return { n: sp.c.length, e: sp.c.filter(c => c[4] === 'e').length }; });
  chk(jan.n === 5 && jan.e === 5, 'a Senbon 2 tem 5 pontos à escolha — ' + j(jan));
  // (lote 196) o Ponto Vital: o arremesso normal já deu o dano; a habilidade só crava (nível 2: até 2, começando com 1)
  const pv = await ev(() => { const sp = __tc.HabAcao.specDe({ id: 'n_ninja_bcab', grau: 2 }); return { d: sp.d || 0, um: sp.um, pad: sp.pad }; });
  chk(!pv.d && pv.um === 2 && pv.pad === 1, 'o Ponto Vital não dá dano (é o arremesso normal) e deixa cravar até 2 — ' + j(pv));
  chk(await ev(() => !__tc.HabAcao.specDe({ id: 'n_ninja_f1', grau: 1 }) && !__tc.HabAcao.specDe({ id: 'n_ninja_f2', grau: 1 })), 'a Kunai e a Bomba de Fumaça saíram do mapa');
  // aplicar direto pelo plano (como a janela faria): o padrão marca só o primeiro ponto
  const r = await ev(([a, b]) => { const H = __tc.HabAcao; const sp = H.specDe({ id: 'n_ninja_bcab', grau: 2 });
    const pl = { de: a, hab: { id: 'n_ninja_bcab', nome: 'Senbon', grau: 2 }, sp, x: 0, y: 0, area: null, alvos: [b] };
    const esc = H.padrao(pl); H.aplicar(pl, esc); return esc.alvos[b].conds; }, ids);
  await w(120);
  chk(j(r) === j(['agulhaPerna']), 'o padrão crava só um ponto — ' + j(r));
  chk((await tok(ids[1])).conds.includes('agulhaPerna'), 'o alvo fica com a Agulha na Perna');
  // o Leque: 3 vezes → Agulhas no Corpo chega a 3 e sugere o Corpo Travado
  for (let i = 0; i < 3; i++) await ev(([a, b]) => { const H = __tc.HabAcao; const sp = H.specDe({ id: 'n_ninja_bb1', grau: 1 });
    const pl = { de: a, hab: { id: 'n_ninja_bb1', nome: 'Leque de Agulhas', grau: 1 }, sp, x: 0, y: 0, area: null, alvos: [b] }; H.aplicar(pl, H.padrao(pl)); }, ids);
  await w(300);
  const c3 = await tok(ids[1]);
  chk(c3.ci.agulhas && c3.ci.agulhas.n === 3, 'três Leques: Agulhas no Corpo em 3 — ' + j(c3.ci.agulhas));
  const toast = await ev(() => [...document.querySelectorAll('.toast, [class*=toast]')].map(x => x.textContent).join(' | '));
  chk(/Corpo Travado/.test(toast), 'o aviso oferece o Corpo Travado — ' + toast.slice(0, 160));
  // a escolha com limite 2 (Mil Agulhas)
  const mil = await ev(([a, b]) => { const H = __tc.HabAcao; const sp = H.specDe({ id: 'n_ninja_bya', grau: 1 });
    return H.padrao({ de: a, sp, alvos: [b] }).alvos[b].conds; }, ids);
  chk(mil.length === 2, 'Mil Agulhas: duas agulhas por alvo — ' + j(mil));
  const errs = (t.errs || []).filter(e => !/favicon|net::|404/.test(e));
  chk(!errs.length, 'sem erros: ' + errs.join(' | '));
  console.log(`${ok} verificações passaram${fail ? ', ' + fail + ' falharam' : ''}`);
  await t.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
