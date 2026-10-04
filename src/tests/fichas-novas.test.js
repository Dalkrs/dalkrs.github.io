// Fichas na mesa de verdade (projeto real), o que entrou depois: ficha de jogador com distribuição livre, só a própria
// ficha à vista (o mestre abre e fecha as outras pelo olho do elenco), imagem do personagem guardada no banco e
// aparecendo no chat, "falar como", Relacionamento de cada um para cada outro, Sanidade e Lapros indo e voltando.
const zlib = require('zlib');
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(buf) { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function png(w, h, cor) {
  const pedaco = (tipo, dados) => { const tam = Buffer.alloc(4), td = Buffer.concat([Buffer.from(tipo, 'latin1'), dados]), c = Buffer.alloc(4); tam.writeUInt32BE(dados.length); c.writeUInt32BE(crc32(td)); return Buffer.concat([tam, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const linha = 1 + w * 3, cru = Buffer.alloc(linha * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b] = cor(x, y), i = y * linha + 1 + x * 3; cru[i] = r; cru[i + 1] = g; cru[i + 2] = b; }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pedaco('IHDR', ihdr), pedaco('IDAT', zlib.deflateSync(cru)), pedaco('IEND', Buffer.alloc(0))]);
}
const pc = (id, nome, lvl) => ({ id, nome, raca: 'Humano', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: lvl, tiers: { FOR: 'A', DES: 'C', AGI: 'D', VIT: 'B', CAN: 'E' }, pctProprio: null, poderes: [],
  skills: { arvores: [], pontos: {}, alocados: {} }, defesas: { DFF: 10, DFM: 4 }, rol: { fixa: 20, fonte: 'total' }, ultRol: null, disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 },
  estaque: { a: '', b: '' }, habilidades: [], itens: [], recursos: [{ id: 'hp' + id, nome: 'HP', fml: 'VIT*8 + LVL*5' }, { id: 'sp' + id, nome: 'SP', fml: 'CAN*6 + LVL*3' }], notas: '' });
const local = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc('pc_dain', 'Dain X', 5), pc('pc_lia', 'Lia', 3), pc('pc_ogro', 'Ogro do pântano', 6)], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: [] });

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', seed: { urgm_calc_atributos_v1: local, 'tinycats:aba': 'fichas' } })).page;
  const J = (await t.device({ name: 'jogador', w: 1250, h: 820, seed: { 'tinycats:aba': 'fichas' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const fichas = async p => { for (let i = 0; i < 40; i++) { const f = p.frame({ url: /\/fichas\// }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 15000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(400); } };
  const nomes = async f => (await f.locator('#lista .pc .nm').allInnerTexts()).join('|');
  const linha = (p, id) => p.evaluate(id => TC.dados.col('personagens').pegar(id), id);
  const abrir = async (f, nome, p) => { await f.locator('#lista .pc', { has: f.locator('.nm', { hasText: new RegExp('^' + nome + '$') }) }).click(); await w(350, p); };
  const feed = p => p.locator('#feed');

  // ---------- o mestre monta a mesa com três fichas ----------
  await M.goto(t.base, { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Fichas novas ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa);
  let F = null;
  ok(await ate(async () => { F = await fichas(M); return F && (await F.locator('#ofertaSim').count()) === 1; }), 'a mesa nova oferece trazer as fichas do navegador');
  await F.locator('#ofertaSim').click(); await w(600);
  ok(await ate(async () => await M.evaluate(() => TC.dados.col('personagens').todas().length === 3 && TC.dados.pendentes === 0)), 'as três fichas sobem para a mesa');
  const mesaId = await M.evaluate(() => TC.mesas.atual.id);
  ok(await F.locator('#lista .olho').count() === 3 && await F.locator('#lista .olho[aria-pressed="true"]').count() === 0, 'o elenco do mestre tem um olho por ficha, todos fechados (só o mestre vê)');
  ok(await F.locator('[data-modo="livre"]').count() === 1, 'ficha de NPC segue a tabela (com o botão para passar à distribuição livre)');

  // ---------- o jogador entra e recebe a ficha dele ----------
  await J.goto(t.base, { waitUntil: 'load' }); await w(1500, J);
  await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
  const jogId = await J.evaluate(() => TC.conta.usuario.id);
  let G = null;
  ok(await ate(async () => { G = await fichas(J); return G && (await G.locator('#ficha').innerText()).includes('Nenhum personagem'); }), 'o jogador entra e não vê ficha nenhuma');
  ok(await ate(async () => (await F.locator('#f_dono option').allInnerTexts()).join('|').includes('Dalmo')), 'o mestre vê o jogador na lista');
  const antes = await F.evaluate(() => { const c0 = calcular(S.personagens[0]); return { nat: c0.nat, tot: c0.tot, hp: c0.recursos[0].val }; });
  await F.locator('#f_dono').selectOption({ label: 'Dalmo' }); await w(500);
  ok(await F.evaluate(() => S.personagens[0].modoAtr === 'livre') && JSON.stringify(await F.evaluate(() => S.personagens[0].atrLivre)) === JSON.stringify(antes.nat), 'ficha entregue a um jogador passa para a distribuição livre, com os valores que tinha');
  ok(JSON.stringify(await F.evaluate(() => { const c0 = calcular(S.personagens[0]); return { nat: c0.nat, tot: c0.tot, hp: c0.recursos[0].val }; })) === JSON.stringify(antes), 'nenhum número da ficha mudou com isso');
  ok(await ate(async () => { const l = await linha(M, 'pc_dain'); return l && l.dono_id === jogId && l.ficha.modoAtr === 'livre' && l.rev > 0 && await M.evaluate(() => TC.dados.pendentes === 0); }), 'e isso fica guardado na mesa');
  ok(await ate(async () => (await nomes(G)) === 'Dain X'), 'o jogador vê a ficha dele — e só ela');
  await abrir(G, 'Dain X', J);
  ok(await G.locator('[data-pts]').count() === 5 && await G.locator('[data-modo]').count() === 0, 'ele distribui os próprios pontos (e não tem o botão de voltar à tabela)');
  ok(await G.locator('#painelMente .mcard').count() === 2 && await G.locator('[data-mente]').count() === 0, 'ficha de jogador já vem com Sanidade e Conforto (100 e 50)');
  await G.locator('[data-ptsstep="FOR|1"]').click(); await w(300, J);
  ok(await ate(async () => (await linha(M, 'pc_dain')).ficha.atrLivre.FOR === antes.nat.FOR + 1), 'o ponto que o jogador põe chega à mesa');
  ok(await ate(async () => await F.evaluate(n => calcular(S.personagens[0]).tot.FOR === n, antes.tot.FOR + 1)), 'e o mestre vê o total novo');

  // ---------- o olho: o mestre escolhe quais fichas os jogadores veem ----------
  await F.locator('#lista .olho[data-olho="pc_ogro"]').click(); await w(300);
  ok(await F.locator('#lista .olho[data-olho="pc_ogro"]').getAttribute('aria-pressed') === 'true', 'o mestre abre o olho do Ogro');
  ok(await ate(async () => (await nomes(G)) === 'Dain X|Ogro do pântano'), 'e a ficha do Ogro aparece para o jogador');
  await abrir(G, 'Ogro do pântano', J);
  ok(await G.locator('#f_nome').isDisabled() && await G.locator('.so-consulta').count() === 1, 'só para consulta');
  await F.locator('#lista .olho[data-olho="pc_ogro"]').click(); await w(300);
  ok(await ate(async () => (await nomes(G)) === 'Dain X'), 'olho fechado de novo: a ficha some da tela do jogador');
  const direto = await J.evaluate(async mesa => { const a = supabase.createClient(TC_CONFIG.url, TC_CONFIG.chave); const { data } = await a.from('personagens').select('id').eq('mesa_id', mesa).eq('apagado', false); return (data || []).map(x => x.id).sort().join(); }, mesaId);
  ok(direto === 'pc_dain', 'pelo banco, o jogador só lê a própria ficha: ' + direto);

  // ---------- relacionamento: cada um tem a sua barra para cada outro ----------
  await abrir(F, 'Lia');
  await F.locator('#f_dono').selectOption({ label: 'Dalmo' }); await w(600);
  ok(await ate(async () => { const a = await linha(M, 'pc_dain'), b = await linha(M, 'pc_lia'); return a.estado.rel && a.estado.rel.some(e => e.alvo === 'pc_lia' && e.nome === 'Lia' && e.v === 0) && b.estado.rel && b.estado.rel.some(e => e.alvo === 'pc_dain' && e.v === 0); }), 'com dois personagens de jogador, cada um ganha a barra de Relacionamento para o outro');
  await abrir(G, 'Dain X', J);
  ok(await ate(async () => (await G.locator('.relrow').count()) === 1 && (await G.locator('.relrow .relnome').innerText()).includes('Lia')), 'o jogador vê, na ficha do Dain, o relacionamento com a Lia');
  const relId = await G.evaluate(() => S.personagens.find(p => p.id === 'pc_dain').estado.rel[0].id);
  for (let i = 0; i < 4; i++) await G.locator(`[data-relstep="${relId}|5"]`).click();
  await w(400, J);
  ok(await ate(async () => { const a = await linha(M, 'pc_dain'), b = await linha(M, 'pc_lia'); return a.estado.rel[0].v === 20 && b.estado.rel.find(e => e.alvo === 'pc_dain').v === 0; }), 'o que o Dain sente pela Lia sobe para 20; o que a Lia sente pelo Dain continua em 0');
  await G.locator('[data-mstep="san|-5"]').click(); await G.locator('#f_lapros').fill('240'); await w(500, J);
  ok(await ate(async () => { const a = await linha(M, 'pc_dain'); return a.estado.san === 95 && a.estado.lapros === 240; }), 'Sanidade e Lapros mudados pelo jogador chegam à mesa');

  // ---------- a imagem do personagem vai para o banco ----------
  await G.locator('#imgIn').setInputFiles({ name: 'dain.png', mimeType: 'image/png', buffer: png(700, 500, (x, y) => [200, 80 + (x >> 3), 30 + (y >> 2)]) });
  ok(await ate(async () => { const l = await linha(J, 'pc_dain'); return l && l.ficha && typeof l.ficha.img === 'string' && l.ficha.img.startsWith('https://'); }, 25000), 'o jogador põe a imagem do personagem');
  const img = (await linha(J, 'pc_dain')).ficha.img;
  ok(img.startsWith('https://kzvhiuhbnsfkmhhgvqlm.supabase.co/storage/v1/object/public/mesas/' + mesaId + '/j/' + jogId + '/'), 'ela fica no banco, na pasta do jogador dentro da mesa');
  const baixou = await M.evaluate(async u => { const r = await fetch(u); const b = await r.blob(); return { st: r.status, tipo: b.type }; }, img);
  ok(baixou.st === 200 && /^image\/(webp|png)$/.test(baixou.tipo), 'e abre pelo endereço: ' + JSON.stringify(baixou));
  ok(await ate(async () => (await F.locator('#lista .pcrow', { hasText: 'Dain X' }).locator('img.avmini').getAttribute('src')) === img), 'o mestre vê a imagem no elenco, sem recarregar');
  const invasor = await J.evaluate(async mesa => { const a = supabase.createClient(TC_CONFIG.url, TC_CONFIG.chave); const cv = document.createElement('canvas'); cv.width = cv.height = 8; const blob = await new Promise(r => cv.toBlob(r, 'image/png')); const up = await a.storage.from('mesas').upload(mesa + '/fora-da-pasta.png', blob, { contentType: 'image/png' }); return up.error ? String(up.error.message) : null; }, mesaId);
  ok(!!invasor, 'fora da pasta dele, o banco continua recusando imagem de jogador: ' + invasor);

  // ---------- a imagem aparece no chat, ao lado do nome ----------
  ok(await ate(async () => (await J.locator('#como').count()) === 1 && (await J.locator('#como').innerText()).trim() === 'Dain X'), 'na mesa ao vivo, o jogador fala como o personagem dele');
  await J.locator('#msg').fill('olá, mesa'); await J.locator('#msg').press('Enter');
  const falaM = feed(M).locator('.fala', { hasText: 'olá, mesa' });
  ok(await ate(async () => (await falaM.count()) === 1), 'a fala chega ao mestre');
  ok(await falaM.locator('img.av').getAttribute('src') === img && (await falaM.locator('.it-h b').innerText()) === 'Dalmo' && (await falaM.locator('.como').innerText()) === 'Dain X', 'com a imagem do personagem ao lado do nome do jogador');
  await abrir(G, 'Dain X', J);
  await G.locator('[data-rolar]').first().click(); await w(400, J);
  const rolM = feed(M).locator('.rol', { hasText: 'Dain X' });
  ok(await ate(async () => (await rolM.count()) >= 1), 'a rolagem pela ficha chega ao mestre');
  ok(await rolM.first().locator('img.av').getAttribute('src') === img, 'também com a imagem do personagem');
  // o jogador tem dois personagens: escolhe com qual fala
  await J.locator('#como').click(); await w(250, J);
  ok((await J.locator('#comoLista button').allInnerTexts()).map(x => x.trim()).join('|') === 'Sem personagem|Dain X|Lia', 'ele escolhe com qual personagem fala: ' + (await J.locator('#comoLista button').allInnerTexts()).map(x => x.trim()).join('|'));
  await J.locator('#comoLista button', { hasText: 'Lia' }).click(); await w(300, J);
  await J.locator('#msg').fill('agora sou a Lia'); await J.locator('#msg').press('Enter');
  const falaLia = feed(M).locator('.fala', { hasText: 'agora sou a Lia' });
  ok(await ate(async () => (await falaLia.count()) === 1 && (await falaLia.locator('.como').innerText()) === 'Lia' && (await falaLia.locator('img.av').count()) === 0), 'falando como Lia (que não tem imagem), a linha sai com o nome dela e sem retrato');
  // o mestre fala como mestre, ou escolhe um personagem
  ok((await M.locator('#como').innerText()).trim() === 'Mestre', 'o mestre, por padrão, fala como mestre');
  await M.locator('#como').click(); await w(250);
  await M.locator('#comoLista button', { hasText: 'Ogro do pântano' }).click(); await w(300);
  await M.locator('#msg').fill('/me rosna'); await M.locator('#msg').press('Enter');
  ok(await ate(async () => (await feed(J).locator('.acao', { hasText: 'Ogro do pântano rosna' }).count()) === 1), 'escolhendo o Ogro, a ação do mestre sai em nome dele');

  // ---------- recarregar: tudo volta do banco ----------
  await J.reload({ waitUntil: 'load' });
  ok(await ate(async () => { G = await fichas(J); return G && (await nomes(G)) === 'Dain X|Lia'; }), 'recarregando, o jogador continua com as fichas dele');
  await abrir(G, 'Dain X', J);
  ok(await G.locator('.retrato .quadro img').getAttribute('src') === img && await G.locator('#f_lapros').inputValue() === '240' && await G.locator('[data-mval="san"]').inputValue() === '95', 'com a imagem, os Lapros e a Sanidade');
  ok(await ate(async () => (await feed(J).locator('.fala', { hasText: 'olá, mesa' }).locator('img.av').count()) === 1), 'e o chat volta com as imagens');

  if (process.env.FOTOS) {            // capturas para olhar depois
    await M.locator('#tab-fichas').click(); await w(600);
    await M.screenshot({ path: process.env.FOTOS + '/novas-mestre.png' });
    await J.locator('#como').click(); await w(300, J);
    await J.screenshot({ path: process.env.FOTOS + '/novas-jogador.png' });
    await J.keyboard.press('Escape');
  }
  await apagarMesaTela(M, nomeMesa);
  const errs = t.errs.filter(e => !/^\[prep\]/.test(e) && !/Multiple GoTrueClient instances/.test(e) && !/status of (400|401|403|409)/.test(e));
  if (errs.length) console.log(errs.slice(0, 10).join('\n'));
  ok(errs.length === 0, 'sem erros inesperados no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
