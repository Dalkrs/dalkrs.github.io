// Bancada (lote 142): os seis minigames (alquimia, ferreiro, invenção; dois jeitos cada; seis níveis) e a página
// sozinha (tudo neste navegador): quem mestra joga, manda um pedido e muda as regras; quem joga (?jogador) vê os
// pedidos, joga, e as regras valem (abrir sozinho, o nível máximo).
const { start, checker } = require('./lib');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));
const j = JSON.stringify;

(async () => {
  const s = await start();
  const dv = await s.device({ name: 'bancada', w: 1300, h: 900 });
  const pg = dv.page;
  pg.setDefaultTimeout(8000);
  const erros = [];
  pg.on('pageerror', e => erros.push(String(e.message)));
  try {
    await pg.goto(s.base + 'bancada/?debug', { waitUntil: 'load' });
    await pg.evaluate(() => {
      localStorage.removeItem('tinycats:bancada:local');
      localStorage.setItem('urgm_calc_atributos_v1', JSON.stringify({ v: 1, personagens: [{ id: 'p1', nome: 'Kael', estado: {} }, { id: 'p2', nome: 'Lia', estado: {} }] }));
    });
    await pg.reload({ waitUntil: 'load' }); await espera(400);

    // ---- os jogos, um por um, por dentro (sem a página): cada jeito em cada nível roda e acaba ----
    const roda = await pg.evaluate(async () => {
      const BJ = TC.bancadaJogos, out = [];
      for (const [of, , js] of BJ.OFICIOS) for (const [jt] of js) for (const [nv] of BJ.NIVEIS) {
        const el = document.createElement('div'); document.body.append(el);
        let fim = null;
        const c = BJ.iniciar(el, { oficio: of, jeito: jt, nivel: nv, seed: 7, aoFim: r => { fim = r; } });
        c.parar();
        for (let i = 0; i < 400 && !fim; i++) { c.passo(0.05); if (i % 9 === 0) { c.tecla(' ', true); c.tecla(' ', false); c.tecla('Enter', true); c.tecla('1', true); c.toque(320, 200, true); } }
        const e = c.estado();
        if (!fim) { el.querySelector('.bj-desistir').click(); }
        out.push({ k: jt + '/' + nv, fim: fim ? fim.ok : 'desistiu', passos: e.passos, tempo: e.tempo, me: e.maxErros, nota: (fim || c.estado().res || {}).nota });
        el.remove();
      }
      return out;
    });
    ok(roda.length === 36 && roda.every(x => x.nota >= 0 && x.nota <= 100), 'os 36 (6 jeitos × 6 níveis) rodam e terminam com uma nota de 0 a 100');
    const pas = jt => roda.filter(x => x.k.startsWith(jt + '/')).map(x => x.passos);
    ok(['caldeirao', 'destilar', 'forja', 'tempera', 'engrenagens'].every(jt => pas(jt).every((v, i, a) => !i || v > a[i - 1])), 'do Fácil ao Lendário, cada jogo tem mais passos — ' + j(pas('forja')));
    ok(roda.filter(x => x.k.endsWith('/facil') && !x.k.startsWith('fiacao')).every(x => x.tempo === 0) && roda.filter(x => x.k.endsWith('/lendario')).every(x => x.tempo > 0 && x.tempo <= 90), 'o Fácil sem pressa; o Lendário com pouco tempo');

    // ---- jogar direito: cada jogo tem como ganhar (o jeito certo, apertado na hora certa) ----
    const ganha = await pg.evaluate(async () => {
      const BJ = TC.bancadaJogos, out = {};
      const novo = (jt, nv) => { const el = document.createElement('div'); document.body.append(el); let fim = null; const c = BJ.iniciar(el, { oficio: 'x', jeito: jt, nivel: nv || 'facil', seed: 3, aoFim: r => { fim = r; } }); c.parar(); return { c, J: c.J, fim: () => fim, el }; };
      // caldeirão: segura o calor no meio da faixa; quando enche, o ingrediente certo
      { const g = novo('caldeirao'); const G = g.c.jogo;
        for (let i = 0; i < 4000 && !g.fim(); i++) { const s = g.J.s; s.aq = s.t < s.alvo; g.c.passo(0.02); if (s.fase === 'pegar') G.escolher(g.J, s.esc.indexOf(s.receita[s.i])); }
        out.caldeirao = g.fim(); g.el.remove(); }
      // destilar: abre devagar e troca na marca
      { const g = novo('destilar'); const G = g.c.jogo;
        for (let i = 0; i < 6000 && !g.fim(); i++) { const s = g.J.s; s.v = 0.4; g.c.passo(0.01); if (Math.abs(s.cheio - s.marca) < s.tol * 0.5) G.trocar(g.J); }
        out.destilar = g.fim(); g.el.remove(); }
      // forja: aquece até a faixa, martela quando o martelo passa no ponto
      { const g = novo('forja'); const G = g.c.jogo;
        for (let i = 0; i < 8000 && !g.fim(); i++) { const s = g.J.s; s.aq = s.h < s.lo + s.larg * 0.3; g.c.passo(0.01); if (!s.aq && s.h >= s.lo && s.h <= s.lo + s.larg && Math.abs(s.m - s.ponto) < s.raio * 0.5) G.martelar(g.J); }
        out.forja = g.fim(); g.el.remove(); }
      // têmpera: mergulha na cor e afia quando a nota chega na linha (as falsas, não)
      { const g = novo('tempera', 'impossivel'); const G = g.c.jogo;
        for (let i = 0; i < 20000 && !g.fim(); i++) { const s = g.J.s; g.c.passo(0.005);
          if (s.fase === 'tempera' && s.h >= s.lo + s.larg * 0.3 && s.h <= s.lo + s.larg * 0.7) G.bater(g.J);
          else if (s.fase === 'afiar') { const n = s.notas.find(x => !x.feita && Math.abs(x.x - s.linha) < 2); if (n && !n.falsa) G.bater(g.J); } }
        out.tempera = g.fim(); g.el.remove(); }
      // engrenagens: trava quando o dente está em cima
      { const g = novo('engrenagens'); const G = g.c.jogo;
        for (let i = 0; i < 20000 && !g.fim(); i++) { const s = g.J.s; g.c.passo(0.002); const e = s.eng[s.i]; if (!e) break; let d = ((e.a + Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI); if (d > Math.PI) d = 2 * Math.PI - d; if (d < s.jan * 0.4) G.travar(g.J); }
        out.engrenagens = g.fim(); g.el.remove(); }
      // fiação: gira cada peça até a da solução (o giro 0 é o do labirinto)
      { const g = novo('fiacao'); const G = g.c.jogo, s = g.J.s;
        for (let c = 0; c < s.n * s.n && !g.fim(); c++) while (s.giro[c] !== 0 && !g.fim()) G.girar(g.J, c);
        out.fiacao = g.fim(); out.fiacaoGiros = s.giros; g.el.remove(); }
      return out;
    });
    ok(['caldeirao', 'destilar', 'forja', 'tempera', 'engrenagens', 'fiacao'].every(k => ganha[k] && ganha[k].ok && ganha[k].nota >= 50), 'jogando direito, os seis dão certo (nota de 50 para cima) — ' + j(Object.fromEntries(Object.entries(ganha).map(([k, v]) => [k, v && v.nota]))));
    const perde = await pg.evaluate(() => {
      const BJ = TC.bancadaJogos, el = document.createElement('div'); document.body.append(el); let fim = null;
      const c = BJ.iniciar(el, { oficio: 'ferreiro', jeito: 'forja', nivel: 'lendario', seed: 2, aoFim: r => { fim = r; } }); c.parar();
      c.J.s.h = 0.05; for (let i = 0; i < 5; i++) c.jogo.martelar(c.J);          // (frio demais: trinca)
      el.remove(); return fim;
    });
    ok(perde && !perde.ok && perde.nota < 50 && perde.motivo === 'erros', 'errando demais no Lendário (2 erros), não dá — ' + j(perde));

    // ---- a página: quem mestra ----
    ok(await pg.locator('#aba-jogar').count() === 1 && await pg.locator('#aba-mandar').count() === 1 && await pg.locator('#aba-regras').count() === 1 && await pg.locator('#aba-vivo').count() === 1, 'quem mestra: Jogar, Mandar, Ao vivo e Regras');
    await pg.locator('#of-ferreiro').click(); await espera(150);
    ok(j(await pg.locator('#jog-jeito button').allTextContents()) === j(['Sorteio', 'Forja', 'Têmpera']) && (await pg.locator('#jog-nivel button').allTextContents()).length === 6, 'o ferreiro: sorteio, forja ou têmpera; os seis níveis');
    await pg.locator('#jog-jeito button', { hasText: 'Têmpera' }).click(); await pg.locator('#jog-nivel button', { hasText: 'Difícil' }).click(); await espera(150);
    await pg.locator('#jog-comecar').click(); await espera(400);
    ok(await pg.locator('.bj[data-jeito="tempera"] canvas').count() === 1 && /Difícil/.test(await pg.locator('.bj-info').innerText()), 'Começar abre o minigame (a têmpera, no Difícil)');
    await pg.locator('.bj-desistir').click(); await espera(300);
    ok(/desistiu, nota \d+\/100/.test(await pg.locator('#res').innerText()), 'desistir: o resultado, com a nota — ' + await pg.locator('#res').innerText());
    await pg.locator('#res-voltar').click(); await espera(200);
    // mandar um pedido para a Lia
    await pg.locator('#aba-mandar').click(); await espera(200);
    await pg.locator('#mand-pc').selectOption('p2'); await pg.locator('#of-invencao').click(); await espera(150);
    await pg.locator('#mand-nivel button', { hasText: 'Absoluto' }).click(); await espera(150);
    await pg.locator('#mand-dano').fill('2d6'); await pg.locator('#mand-nota').fill('Consertar o relógio da torre');
    await pg.locator('#mand-ok').click(); await espera(250);
    const ped = await pg.evaluate(() => JSON.parse(localStorage.getItem('tinycats:bancada:local'))['fichas:banc:pc:p2']);
    const p0 = ped && Object.values(ped.ps)[0];
    ok(p0 && p0.of === 'invencao' && p0.nivel === 'absoluto' && p0.dano === '2d6' && p0.e === 'novo' && /relógio/.test(p0.nota), 'mandar: o pedido fica com a Lia (invenção, Absoluto, 2d6) — ' + j(p0));
    // as regras
    await pg.locator('#aba-regras').click(); await espera(200);
    await pg.locator('#reg-max button', { hasText: 'Médio' }).click(); await espera(150);
    await pg.locator('#reg-dano-medio').fill('1d4'); await pg.locator('#reg-dano-medio').blur(); await espera(150);
    let cfg = await pg.evaluate(() => JSON.parse(localStorage.getItem('tinycats:bancada:local'))['fichas:banc:cfg']);
    ok(cfg && cfg.max === 1 && cfg.dano[1] === '1d4' && cfg.solto === true, 'as regras: sozinhos até o Médio, o Médio machuca 1d4 — ' + j(cfg));

    // ---- a página: quem joga ----
    await pg.goto(s.base + 'bancada/?debug&jogador', { waitUntil: 'load' }); await espera(400);
    ok(await pg.locator('#aba-pedidos .n').innerText() === '1' && await pg.locator('#aba-mandar').count() === 0, 'quem joga: Jogar e Pedidos (1 pedido esperando); sem Mandar');
    ok(await pg.locator('#jog-nivel button', { hasText: 'Difícil' }).isDisabled() && !(await pg.locator('#jog-nivel button', { hasText: 'Médio' }).isDisabled()), 'os níveis acima do Médio ficam travados');
    await pg.locator('#jog-nivel button', { hasText: 'Médio' }).click(); await espera(150);
    ok(/1d4 no HP/.test(await pg.locator('#jog-dano').innerText()), 'e avisa o dano do nível');
    await pg.locator('#aba-pedidos').click(); await espera(200);
    ok(/Invenção/.test(await pg.locator('[data-ped]').innerText()) && /relógio/.test(await pg.locator('[data-ped]').innerText()) && /2d6 no HP/.test(await pg.locator('[data-ped]').innerText()), 'o pedido: o ofício, o nível, o recado e o dano');
    await pg.locator('[data-ped] button', { hasText: 'Jogar' }).click(); await espera(400);
    ok(await pg.locator('.bj canvas').count() === 1 && /Absoluto/.test(await pg.locator('.bj-info').innerText()), 'jogar o pedido abre o minigame do nível pedido');
    await pg.locator('.bj-desistir').click(); await espera(300);
    const res = await pg.locator('#res').innerText();
    ok(/Lia · Invenção, (Engrenagens|Fiação) \(Absoluto\): desistiu, nota \d+\/100 .* dano 2d6 = \d+ \(pedido do mestre\)\./.test(res), 'o fim: o resultado e o dano rolado — ' + res);
    const ped2 = await pg.evaluate(() => Object.values(JSON.parse(localStorage.getItem('tinycats:bancada:local'))['fichas:banc:pc:p2'].ps)[0]);
    ok(ped2.e === 'feito' && ped2.res && ped2.res.ok === false && /2d6/.test(ped2.res.dano), 'o pedido fica feito, com o resultado (o mestre vê)');
    await pg.locator('#res-voltar').click(); await espera(200);
    ok(await pg.locator('#ped-vazio').count() === 1 || await pg.locator('#aba-jogar[aria-selected="true"]').count() === 1, 'e sai dos pedidos');
    // o mestre desliga o abrir sozinho
    await pg.evaluate(() => { const l = JSON.parse(localStorage.getItem('tinycats:bancada:local')); l['fichas:banc:cfg'].solto = false; localStorage.setItem('tinycats:bancada:local', JSON.stringify(l)); });
    await pg.reload({ waitUntil: 'load' }); await espera(400);
    await pg.locator('#aba-jogar').click(); await espera(150);
    ok(await pg.locator('#solto-off').count() === 1 && await pg.locator('#jog-comecar').count() === 0, 'com o abrir sozinho desligado, quem joga só tem os pedidos');
    ok(!erros.length, 'sem erros na página: ' + erros.slice(0, 3).join(' | '));
  } finally {
    await s.close();
  }
  end();
})().catch(e => { console.error(e); process.exit(1); });
