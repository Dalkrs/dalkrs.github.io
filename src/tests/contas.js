// Contas de teste no projeto real. A senha é sorteada na primeira vez e fica FORA do repositório.
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const ARQ = path.join(process.env.TC_SCRATCH || path.join(os.tmpdir(), 'tinycats-teste'), 'tc-teste.json');
function contas() {
  if (fs.existsSync(ARQ)) return JSON.parse(fs.readFileSync(ARQ, 'utf8'));
  const sufixo = crypto.randomBytes(4).toString('hex');
  const c = { senha: crypto.randomBytes(12).toString('base64url'), mestre: `mestre-${sufixo}@tinycats.test`, jog1: `jog1-${sufixo}@tinycats.test`, jog2: `jog2-${sufixo}@tinycats.test` };
  fs.mkdirSync(path.dirname(ARQ), { recursive: true });
  fs.writeFileSync(ARQ, JSON.stringify(c, null, 1));
  return c;
}
// Dentro da página: cria a conta (se ainda não existe) e entra.
async function entrar(page, email, senha, nome) {
  return page.evaluate(async ([email, senha, nome]) => {
    const r = await fetch(TC_CONFIG.url + '/functions/v1/criar-conta', { method: 'POST', headers: { 'content-type': 'application/json', apikey: TC_CONFIG.chave }, body: JSON.stringify({ email, senha, nome }) });
    const criar = r.status;
    const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
    return { criar, erro: error ? error.message : null, uid: data && data.user ? data.user.id : null };
  }, [email, senha, nome]);
}
module.exports = { contas, entrar };

/* Atalhos pela tela da casca (usados pelos testes de mesa). */
async function loginTela(page, email, senha) {
  try { await page.locator('#btnConta').click(); }
  catch (e) {
    // (para saber o que havia na página quando o botão não veio: outra página? a casca sem terminar de abrir?)
    let d;
    try {
      d = await Promise.race([page.evaluate(() => { const b = document.getElementById('btnConta'); return { url: location.href, pronto: document.readyState, corpo: document.body ? document.body.innerHTML.length : -1, tc: typeof TC, botao: b ? (b.hidden ? 'escondido' : 'visível') : 'não existe' }; }),
        new Promise(r => setTimeout(() => r('a página não responde'), 5000))]);
    } catch (x) { d = 'sem resposta: ' + String(x.message).split('\n')[0]; }
    throw new Error('O botão da conta não apareceu — ' + JSON.stringify(d) + ' — ' + String(e.message).split('\n')[0]);
  }
  await page.locator('#c-email').fill(email); await page.locator('#c-senha').fill(senha); await page.locator('#c-ok').click();
  await page.locator('#m-nome').waitFor({ timeout: 20000 });
}
// Cria a mesa e devolve o código de convite. Com { semCodigo: true } não abre o menu da mesa (o Esc que o fecha pode
// cair na janela que um sistema acabou de abrir, como a oferta de trazer as cenas); o código se lê depois, com codigoDaMesa.
async function criarMesaTela(page, nome, o) {
  await page.locator('#m-nome').fill(nome); await page.locator('#m-criar').click();
  await page.locator('#vivo').waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('dialog[open]').waitFor({ state: 'hidden', timeout: 20000 });
  return o && o.semCodigo ? null : codigoDaMesa(page);
}
async function codigoDaMesa(page) {
  await page.locator('#btnConta').click(); await page.waitForTimeout(350);
  const codigo = (await page.locator('#codigo').innerText()).trim();
  await page.keyboard.press('Escape');
  return codigo;
}
async function entrarMesaTela(page, codigo, nome) {
  await page.locator('#m-cod').fill(codigo); await page.locator('#m-meu').fill(nome); await page.locator('#m-entrar').click();
  await page.locator('#vivo').waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('dialog[open]').waitFor({ state: 'hidden', timeout: 20000 });
}
async function apagarMesaTela(page, nome) {
  await page.locator('#btnConta').click(); await page.waitForTimeout(300);
  await page.locator('#menu .lk', { hasText: 'Apagar esta mesa' }).click();
  await page.locator('#a-nome').fill(nome); await page.locator('dialog .btn.per').click();
  await page.locator('#vivo').waitFor({ state: 'hidden', timeout: 20000 });
}
Object.assign(module.exports, { loginTela, criarMesaTela, codigoDaMesa, entrarMesaTela, apagarMesaTela });
