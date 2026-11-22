// (lote 199) O Feiticeiro em três ramos: as condições novas (Loucura → Surto com a tabela, Iludido, Fundido, Assinado),
// a ilusão que só o iludido vê (t.il), a Crise que põe +2 de Loucura (nq), o Cobrar que tira as Assinaturas (tira) e a
// Sombra que Abraça (invocação colada + Fundido).
const { open } = require('./lib');
(async () => {
  const t = await open(); const { page } = t; const ev = (fn, a) => page.evaluate(fn, a); const w = ms => page.waitForTimeout(ms);
  let ok = 0, fail = 0; const chk = (c, m) => { if (c) ok++; else { fail++; console.log('FALHOU: ' + m); } };
  const j = JSON.stringify;
  chk(await ev(() => ['loucura', 'surto', 'iludido', 'fundido', 'assinado', 'agouro', 'elo'].every(id => __tc.COND_BY_ID[id] && __tc.COND_BY_ID[id].r === 'Feiticeiro')), 'as 7 condições do Feiticeiro existem');
  chk(await ev(() => __tc.COND_BY_ID.surto.tab.length === 6 && __tc.COND_BY_ID.loucura.lim.sug === 'surto'), 'a Loucura sugere o Surto, que tem a tabela de 6');
  const pid = await ev(() => { const S = __tc.Store.S; return (S.players[0] || {}).id || null; });
  const ids = await ev(pid => { const { Store, newToken } = __tc, sc = Store.scene();
    const a = newToken(sc, 6 * sc.cell, 6 * sc.cell, { name: 'Feiticeiro' }), b = newToken(sc, 9 * sc.cell, 6 * sc.cell, { name: 'Alvo', owner: pid }), c = newToken(sc, 9 * sc.cell, 9 * sc.cell, { name: 'Outro' });
    Store.tx('Criar', () => { Store.add('tokens', a); Store.add('tokens', b); Store.add('tokens', c); }); return [a.id, b.id, c.id]; }, pid);
  const usar = (hid, grau, alvos, mexe) => ev(([a, hid, grau, alvos, mexe]) => { const H = __tc.HabAcao; const sp = H.specDe({ id: hid, grau });
    const pl = { de: a, hab: { id: hid, nome: hid, grau }, sp, x: 0, y: 0, area: null, alvos }; const esc = H.padrao(pl); if (mexe === 'passou') for (const k in esc.alvos) esc.alvos[k].falhou = false; H.aplicar(pl, esc); return true; }, [ids[0], hid, grau, alvos, mexe]);
  const tok = id => ev(id => { const t = __tc.Store.get('tokens', id); return t ? { conds: t.conds, ci: t.cinfo } : null; }, id);
  // Miragem: o alvo fica Iludido e aparece a ilusão colada nele, só para ele
  await usar('n_feiticeiro_b_i1', 1, [ids[1]]); await w(80);
  chk((await tok(ids[1])).conds.includes('iludido'), 'Miragem: o alvo fica Iludido');
  const il = await ev(b => __tc.Store.scene().tokens.filter(t => t.il === b).map(t => ({ id: t.id, n: t.name, inv: t.inv, show: t.showName })), ids[1]);
  chk(il.length === 1 && il[0].inv && il[0].inv.d === 1 && il[0].show === false, 'a ilusão nasce com 1 turno e sem o nome à mostra — ' + j(il));
  const vis = await ev(([ilid, pid]) => { const u = __tc, sc = u.Store.scene(), t = u.Store.get('tokens', ilid), v0 = u.App.viewer;
    const gm = u.tokShown(t, sc); u.App.viewer = pid; const dono = u.tokShown(t, sc); u.App.viewer = 'zz-ninguem'; const outro = u.tokShown(t, sc); u.App.viewer = v0; return { gm, dono, outro }; }, [il[0].id, pid]);
  chk(vis.gm && vis.dono && !vis.outro, 'o mestre e o dono do iludido veem a ilusão; outro jogador não — ' + j(vis));
  // passou no teste: nada de ilusão nem de condição
  await usar('n_feiticeiro_b_i1', 1, [ids[2]], 'passou'); await w(60);
  chk(await ev(c => !__tc.Store.scene().tokens.some(t => t.il === c), ids[2]), 'quem passa no teste não vê ilusão');
  // Dois de Você: as cópias têm o nome de quem usou
  await usar('n_feiticeiro_b_i4', 1, [ids[2]]); await w(60);
  const cop = await ev(c => __tc.Store.scene().tokens.filter(t => t.il === c).map(t => t.name), ids[2]);
  chk(cop.length === 2 && cop.every(n => n === 'Feiticeiro'), 'Dois de Você: duas cópias com o nome de quem usou — ' + j(cop));
  // Loucura: Sussurro (+1) e Crise (+2) → chega a 3 e o aviso oferece o Surto
  await usar('n_feiticeiro_b_l1', 1, [ids[1]]); await w(60);
  chk((await tok(ids[1])).ci.loucura.n === 1, 'Sussurro na Nuca: Loucura 1');
  await usar('n_feiticeiro_b_l3', 1, [ids[1]]); await w(300);
  chk((await tok(ids[1])).ci.loucura.n === 3, 'Crise: +2, Loucura 3');
  const toast = await ev(() => [...document.querySelectorAll('.toast, [class*=toast]')].map(x => x.textContent).join(' | '));
  chk(/Surto/.test(toast), 'o aviso oferece o Surto — ' + toast.slice(0, 160));
  // aplicar o Surto pelo botão do aviso: a tabela rola, a Loucura zera
  await ev(() => { const b = [...document.querySelectorAll('.toast button, [class*=toast] button')].find(x => /Surto/.test(x.textContent)); if (b) b.click(); });
  await w(200);
  const ds = await tok(ids[1]);
  chk(ds.conds.includes('surto') && !ds.conds.includes('loucura'), 'o Surto entra e a Loucura zera — ' + j(ds.conds));
  const toast2 = await ev(() => [...document.querySelectorAll('.toast, [class*=toast]')].map(x => x.textContent).join(' | '));
  chk(/d6 = [1-6]/.test(toast2), 'o aviso diz o d6 da tabela — ' + toast2.slice(0, 200));
  // Assinar em Sangue 2× e Cobrar: as Assinaturas somem
  await usar('n_feiticeiro_ccab', 1, [ids[2]]); await usar('n_feiticeiro_ccab', 1, [ids[2]]); await w(60);
  chk((await tok(ids[2])).ci.assinado.n === 2, 'Assinar em Sangue 2×: Assinado 2');
  await usar('n_feiticeiro_c1', 1, [ids[2]]); await w(60);
  chk(!(await tok(ids[2])).conds.includes('assinado'), 'Cobrar tira as Assinaturas');
  // Sombra que Abraça: a invocação nasce e o alvo fica Fundido
  const n0 = await ev(() => __tc.Store.scene().tokens.length);
  await ev(([a, b]) => { const H = __tc.HabAcao, sc = __tc.Store.scene(), t = __tc.Store.get('tokens', b); const sp = H.specDe({ id: 'n_feiticeiro_ab2', grau: 1 });
    const pl = { de: a, hab: { id: 'n_feiticeiro_ab2', nome: 'Sombra', grau: 1 }, sp, x: t.x + sc.cell / 2, y: t.y + sc.cell / 2, area: null, alvos: [b] }; H.aplicar(pl, H.padrao(pl)); }, [ids[0], ids[2]]);
  await w(60);
  const sb = await ev(() => __tc.Store.scene().tokens.filter(t => t.name === 'Sombra que Abraça').map(t => t.inv && t.inv.d));
  chk(sb.length === 1 && sb[0] === 3, 'a Sombra que Abraça nasce por 3 turnos — ' + j(sb));
  chk((await tok(ids[2])).conds.includes('fundido'), 'o alvo fica Fundido');
  chk(await ev(n0 => __tc.Store.scene().tokens.length === n0 + 1, n0), 'só um token novo (a sombra)');
  // as specs do mapa: as 53 ativas com regra, e nenhuma do Feiticeiro antigo
  const sp = await ev(() => { const H = window.TC.habsAcoes.H; const k = Object.keys(H).filter(x => x.startsWith('n_feiticeiro_')); return { n: k.length, velhas: k.filter(x => /_(am|ac|ay|bb|bc|by|cb|cc|cy|ponte)\d/.test(x)).length }; });
  chk(sp.n === 53 && sp.velhas === 0, 'as regras de mapa do Feiticeiro são as novas — ' + j(sp));
  const errs = (t.errs || []).filter(e => !/favicon|net::|404/.test(e));
  chk(!errs.length, 'sem erros: ' + errs.join(' | '));
  console.log(`${ok} verificações passaram${fail ? ', ' + fail + ' falharam' : ''}`);
  await t.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
