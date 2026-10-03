// Contas de teste no projeto real. A senha é sorteada na primeira vez e fica FORA do repositório.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ARQ = path.join(process.env.TC_SCRATCH || '/tmp/claude-0/-home-claude-dalkrs-github-io/5882dc29-5a93-5459-98f8-cb7f2bf623b7/scratchpad', 'tc-teste.json');
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
