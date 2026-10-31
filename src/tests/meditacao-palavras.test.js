// As palavras da Meditação (lote 45), pela interface, sem mesa (a página sozinha, com o personagem de teste):
//   · "Dar uma palavra…": a janela (palavra, sentido, nota, para quem), a palavra vazia, a repetida; o Desfazer;
//   · as palavras do personagem (quem mestra): mudar o sentido e a nota, tirar (com Desfazer);
//   · a receita com uma palavra nos pilares (o grupo Palavras; uma palavra que ninguém tem, com o aviso);
//   · os pilares: o grupo Palavras (as favoritas primeiro), a palavra no pilar (a letra na pedra, a palavra embaixo),
//     acertar a receita com a palavra; a palavra que saiu do dicionário não vale;
//   · o dicionário: "Nova", a nota do jogador, a estrela, a busca, a ordem e onde a palavra já foi usada;
//   · recarregar (tudo continua) e a tela estreita.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));
async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }
const j = JSON.stringify;

(async () => {
  const t = await start();
  const dv = await t.device({ name: 'meditacao', w: 1400, h: 900 });
  const P = dv.page;
  P.setDefaultTimeout(8000);
  const A = (fn, arg) => P.evaluate(fn, arg);
  const campo = k => P.locator(`[data-k="${k}"]`);
  async function escrever(k, v) { const c = campo(k); await c.fill(v); await c.dispatchEvent('change'); await espera(150); }
  const doc = id => A(id => __medit.doc(id), id);
  const avisos = () => A(() => [...document.querySelectorAll('#toasts .toast')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const desfazerDoAviso = async () => { await P.locator('#toasts .toast button', { hasText: 'Desfazer' }).last().click(); await espera(300); };
  const foto = async nome => { if (process.env.TC_SCRATCH) { require('fs').mkdirSync(path.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png'), fullPage: false }); } };
  const PC = 'pc_teste', W = 'medit:palavras:' + PC;
  const palavras = async () => ((await doc(W)) || { lista: [] }).lista.map(x => x.p + '=' + x.k);
  const dar = async (p, s, n) => {
    await P.locator('[data-k="pal:dar"]').click(); await espera(200);
    await P.locator('[data-k="dp:p"]').fill(p);
    if (s) await P.locator('[data-k="dp:s"]').fill(s);
    if (n) await P.locator('[data-k="dp:n"]').fill(n);
    await P.locator('[data-k="dp:sim"]').click(); await espera(300);
  };

  await passo('a página e as palavras do personagem', async () => {
    await P.goto(t.base + 'meditacao/?debug', { waitUntil: 'load' });
    await P.waitForFunction(() => window.__medit && __medit.pronto, null, { timeout: 15000 }); await espera(300);
    await P.locator('[data-k="chamar"]').click(); await espera(200);
    await P.locator('dialog [data-pc]').first().check(); await P.locator('[data-k="dl:sim"]').click(); await espera(400);
    ok(/Palavras de Personagem de teste/.test(await P.locator('#painel').innerText()) && /Nenhuma palavra ainda/.test(await P.locator('#painel').innerText()), 'a seção "Palavras de…" na prática, ainda vazia');
    ok(/Nenhuma palavra ainda\. O mestre dá as palavras/.test(await P.locator('#painel').innerText()), 'e o dicionário vazio diz o que fazer');
  });

  await passo('dar uma palavra', async () => {
    await P.locator('[data-k="pal:dar"]').click(); await espera(200);
    ok(await P.locator('dialog [data-k="dp:p"]').isVisible() && await P.locator('dialog [data-pc]').first().isChecked(), 'a janela: a palavra, o sentido, a nota e para quem (o personagem já marcado)');
    await P.locator('[data-k="dp:sim"]').click(); await espera(150);
    ok(/Escreva a palavra/.test(await P.locator('[data-k="dp:aviso"]').innerText()) && await P.locator('dialog[open]').count() === 1, 'sem a palavra, a janela diz o que falta e fica aberta');
    await P.locator('[data-k="dp:p"]').fill('Æthra'); await P.locator('[data-k="dp:s"]').fill('A luz que vem antes do sol'); await P.locator('[data-k="dp:n"]').fill('Ouvida no templo de Selene');
    await P.locator('[data-k="dp:sim"]').click(); await espera(300);
    ok(j(await palavras()) === j(['Æthra=aethra']), 'a palavra vai para o dicionário (a chave sem acento) — ' + j(await palavras()));
    ok(/“Æthra” foi para o dicionário de Personagem de teste\./.test(await avisos()), 'o aviso, com Desfazer');
    await desfazerDoAviso();
    ok(j(await palavras()) === j([]), 'Desfazer: a palavra sai');
    await dar('Æthra', 'A luz que vem antes do sol', 'Ouvida no templo de Selene');
    await dar('aethra');
    ok(/já tem essa palavra/.test(await P.locator('[data-k="dp:aviso"]').innerText()), 'a mesma palavra (sem acento, em minúsculas) não entra duas vezes');
    await P.locator('[data-k="dp:nao"]').click(); await espera(150);
    await dar('Vel Ruun', 'Chama que não queima');
    await dar('Oro', 'Silêncio');
    ok(j(await palavras()) === j(['Æthra=aethra', 'Vel Ruun=vel-ruun', 'Oro=oro']), 'três palavras — ' + j(await palavras()));
    await foto('l45-medit-mestre-palavras');
  });

  await passo('mudar e tirar (quem mestra)', async () => {
    const id = (await doc(W)).lista.find(x => x.k === 'oro').id;
    await escrever('pal:s:' + id, 'O silêncio entre dois sons');
    ok((await doc(W)).lista.find(x => x.k === 'oro').s === 'O silêncio entre dois sons', 'o sentido muda');
    await P.locator(`[data-k="pal:x:${id}"]`).click(); await espera(250);
    ok(!(await palavras()).includes('Oro=oro') && /“Oro” saiu do dicionário/.test(await avisos()), 'tirar a palavra (com o aviso)');
    await desfazerDoAviso();
    ok((await palavras()).includes('Oro=oro'), 'Desfazer: ela volta');
  });

  await passo('a receita com uma palavra', async () => {
    await P.locator('[data-vista="receitas"]').click(); await espera(300);
    await P.locator('[data-k="rc:nova"]').click(); await espera(300);
    await escrever('rc:nome', 'Alvorada interior');
    await P.locator('[data-k="grupos-rc"] [data-grupo="as"]').click(); await espera(150);
    await P.locator('[data-rsimb="sol"]').click(); await espera(200);
    await P.locator('[data-k="grupos-rc"] [data-grupo="pal"]').click(); await espera(150);
    ok(await P.locator('[data-k="simbolos-rc"] .simb.pal').count() === 3, 'o grupo Palavras: as três que o personagem tem');
    await P.locator('[data-rsimb="w.aethra"]').click(); await espera(200);
    await escrever('rc:efeito', 'O calor do primeiro sol percorre o corpo.');
    const rc = (await doc('medit:receitas')).lista[0];
    ok(j(rc.seq) === j(['sol', 'w.aethra']), 'a receita: Sol → “Æthra” — ' + j(rc.seq));
    ok(/Sol → “Æthra”/.test(await P.locator('.rec-lista').innerText()), 'na lista, a sequência com a palavra');
    // uma palavra que ninguém tem
    await P.locator('[data-k="rp:2"]').click(); await espera(100);
    await P.locator('[data-k="rc:palavra"]').fill('Kaen'); await P.locator('[data-k="rc:palavra-por"]').click(); await espera(250);
    ok(j((await doc('medit:receitas')).lista[0].seq) === j(['sol', 'w.aethra', 'w.kaen']) && /Ninguém tem a palavra “kaen” ainda/.test(await P.locator('.rec-lista').innerText()), '"Outra palavra": entra no pilar, e o aviso diz que ninguém a tem');
    await foto('l45-medit-receita');
    await P.locator('[data-k="rp:2"]').click(); await P.locator('[data-k="rp:tirar"]').click(); await espera(250);
    ok(j((await doc('medit:receitas')).lista[0].seq) === j(['sol', 'w.aethra']), '(tirar o terceiro pilar)');
    await P.locator('[data-vista="cena"]').click(); await espera(300);
  });

  await passo('os pilares com a palavra', async () => {
    await P.locator('[data-k^="lib:"]').first().click(); await espera(300);
    await P.locator('[data-k="grupos"] [data-grupo="pal"]').click(); await espera(150);
    const nomes = await P.locator('[data-k="simbolos"] .simb.pal span').allInnerTexts();
    ok(j(nomes) === j(['Æthra', 'Oro', 'Vel Ruun']), 'o grupo Palavras nos pilares, de A a Z — ' + j(nomes));
    await P.locator('[data-k="grupos"] [data-grupo="as"]').click(); await P.locator('[data-simb="sol"]').click(); await espera(100);
    await P.locator('[data-k="grupos"] [data-grupo="pal"]').click(); await P.locator('[data-simb="w.aethra"]').click(); await espera(150);
    ok(await P.locator('[data-k="pilar:1"].pal .pglifo').innerText() === 'Æ' && /Æthra/.test(await P.locator('[data-k="pilar:1"] small').innerText()), 'no pilar: a primeira letra na pedra, a palavra embaixo');
    await foto('l45-medit-pilares');
    await P.locator('[data-k="tentar"]').click(); await espera(400);
    ok(/Você descobriu: Alvorada interior/.test(await P.locator('[data-k="res"]').innerText()), 'Sol → “Æthra”: descobriu a receita');
  });

  await passo('o dicionário', async () => {
    const lista = await doc(W), id = lista.lista.find(x => x.k === 'aethra').id, idV = lista.lista.find(x => x.k === 'vel-ruun').id;
    const verb = P.locator(`.verbete[data-pal="${id}"]`).last();
    ok(/Usada em: Alvorada interior/.test(await verb.innerText()), 'onde a palavra foi usada: na receita descoberta — ' + (await verb.innerText()).replace(/\n/g, ' | '));
    ok(/A luz que vem antes do sol/.test(await verb.innerText()) && /Do mestre: Ouvida no templo de Selene/.test(await verb.innerText()), 'o sentido e a nota do mestre');
    await escrever('pal:nota:' + id, 'Funciona ao amanhecer');
    ok(((await doc('medit:pratica:' + PC)).pal || {})[id].n === 'Funciona ao amanhecer', 'a nota do jogador mora na prática');
    await P.locator(`[data-k="pal:fav:${idV}"]`).click(); await espera(200);
    ok(((await doc('medit:pratica:' + PC)).pal || {})[idV].f === true, 'a estrela também');
    await P.locator('[data-k="grupos"] [data-grupo="pal"]').click(); await espera(150);
    ok((await P.locator('[data-k="simbolos"] .simb.pal span').first().innerText()) === 'Vel Ruun', 'a favorita vem primeiro nos pilares');
    await P.locator('[data-k="dic:busca"]').fill('silencio'); await espera(250);
    ok(await P.locator('.dic .verbete').filter({ hasText: 'Oro' }).count() >= 1 && await P.locator('section:has([data-k="dic:busca"]) .verbete').count() === 1, 'a busca acha pelo sentido, sem acento');
    await P.locator('[data-k="dic:busca"]').fill(''); await espera(200);
    await P.locator('[data-k="dic:ordem"]').selectOption('usadas'); await espera(200);
    ok((await P.locator('section:has([data-k="dic:busca"]) .verbete .vb-p').first().innerText()) === 'Æthra', 'a ordem "As mais usadas"');
    await foto('l45-medit-dicionario');
  });

  await passo('a palavra que sai do dicionário', async () => {
    const id = (await doc(W)).lista.find(x => x.k === 'aethra').id;
    await P.locator(`[data-k="pal:x:${id}"]`).click(); await espera(250);
    const r = await A(pc => MeditacaoNucleo.localTentar({ quem: [pc] }, null, { lib: 5, feitas: 0 }, null, pc, ['sol', 'w.aethra'], null, __medit.doc('medit:palavras:' + pc)), PC);
    ok(r && !r.ok && /não está no dicionário/.test(r.msg), 'sem a palavra no dicionário, a tentativa não vale — ' + j(r));
    await desfazerDoAviso();
  });

  await passo('recarregar e a tela estreita', async () => {
    await P.reload({ waitUntil: 'load' });
    await P.waitForFunction(() => window.__medit && __medit.pronto, null, { timeout: 15000 }); await espera(300);
    ok(j(await palavras()) === j(['Æthra=aethra', 'Vel Ruun=vel-ruun', 'Oro=oro']), 'depois de recarregar, as palavras continuam');
    await P.setViewportSize({ width: 390, height: 844 }); await espera(400);
    ok(await A(() => document.documentElement.scrollWidth <= innerWidth + 1), 'na tela estreita, nada passa da largura');
    await P.locator('section:has([data-k="dic:busca"])').scrollIntoViewIfNeeded(); await espera(200);
    await foto('l45-medit-celular');
  });

  const fora = t.errs.filter(e => !/favicon|fonts\.g/.test(e));
  ok(fora.length === 0, 'sem erros no console: ' + fora.slice(0, 3).join(' | '));
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
