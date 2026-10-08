// A "porta" local do banco de ensaio (ver LEIA.md): faz o papel do endereço do Supabase para o site, nos testes.
//   /rest/v1/…       repassa ao PostgREST local (que fala com o PostgreSQL local, com as regras de acesso valendo)
//   /auth/v1/…       entrar com e-mail e senha, renovar o passe, quem sou eu, sair — o que o site usa das contas
//   /functions/v1/…  criar-conta (cria a conta local) e faxina (não há o que limpar aqui)
//   /storage/v1/…    enviar, listar, apagar e ler imagens do balde "mesas": os arquivos ficam numa pasta daqui; quem
//                    pode o quê é o banco que decide (as regras de storage.objects das migrações)
//   /realtime/v1/…   não existe: o site segue pela leitura periódica, como já faz neste ambiente de testes
// Não é o Supabase e não guarda segredo nenhum: serve só para ensaiar. Ligada por banco.sh.
'use strict';
const http = require('http'), https = require('https'), crypto = require('crypto'), fs = require('fs'), path = require('path');
const PORTA = Number(process.env.TC_PORTA) || 54331;
const REST = (process.env.TC_REST || 'http://127.0.0.1:54330').replace(/\/$/, '');
const SEGREDO = process.env.TC_JWT || 'tinycats-banco-local-de-ensaio-isto-nao-e-segredo-0123456789';
const ARQUIVOS = process.env.TC_ARQUIVOS || path.join(require('os').tmpdir(), 'tinycats-local-arquivos');
const UMA_HORA = 3600;
fs.mkdirSync(ARQUIVOS, { recursive: true });

/* ---- o passe (JWT, HS256): o mesmo segredo do PostgREST ---- */
const b64 = x => Buffer.from(x).toString('base64url');
function assinar(claims) {
  const h = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' })), p = b64(JSON.stringify(claims));
  return h + '.' + p + '.' + crypto.createHmac('sha256', SEGREDO).update(h + '.' + p).digest('base64url');
}
function lerPasse(token) {
  const partes = String(token || '').split('.');
  if (partes.length !== 3) return null;
  const certa = crypto.createHmac('sha256', SEGREDO).update(partes[0] + '.' + partes[1]).digest('base64url');
  if (certa.length !== partes[2].length || !crypto.timingSafeEqual(Buffer.from(certa), Buffer.from(partes[2]))) return null;
  let c; try { c = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8')); } catch (e) { return null; }
  return c && (!c.exp || c.exp > Date.now() / 1000) ? c : null;
}
const agora = () => Math.floor(Date.now() / 1000);
const SERVICO = assinar({ role: 'service_role', iss: 'tinycats-local', exp: agora() + 10 * 365 * 86400 });
const passeDe = rq => { const m = /^Bearer\s+(.+)$/i.exec(rq.headers.authorization || ''); return m ? m[1] : ''; };

/* ---- falar com o PostgREST: `perfil` é o esquema ('auth', 'storage'); `passe`, de quem pede (ou o do serviço) ---- */
async function banco(metodo, caminho, { perfil, passe, corpo, prefer } = {}) {
  const h = { Authorization: 'Bearer ' + (passe || SERVICO), 'Content-Type': 'application/json' };
  if (perfil) { h['Accept-Profile'] = perfil; h['Content-Profile'] = perfil; }
  if (prefer) h.Prefer = prefer;
  const r = await fetch(REST + caminho, { method: metodo, headers: h, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
  const texto = await r.text();
  let dados = null; try { dados = texto ? JSON.parse(texto) : null; } catch (e) { dados = texto; }
  return { ok: r.ok, status: r.status, dados };
}

/* ---- respostas ---- */
function cors(rq, extra) {
  return Object.assign({
    'Access-Control-Allow-Origin': rq.headers.origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': rq.headers['access-control-request-headers'] || 'authorization, apikey, content-type, prefer, x-client-info, accept-profile, content-profile, range, x-upsert, cache-control',
    'Access-Control-Expose-Headers': 'Content-Encoding, Content-Location, Content-Range, Content-Type, Date, Location, Range-Unit, Preference-Applied',
    'Access-Control-Max-Age': '3600', Vary: 'Origin',
  }, extra || {});
}
const json = (rq, rs, status, corpo) => { const b = Buffer.from(JSON.stringify(corpo)); rs.writeHead(status, cors(rq, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': b.length })); rs.end(b); };
const lerCorpo = rq => new Promise((ok, falha) => { const ps = []; rq.on('data', d => ps.push(d)); rq.on('end', () => ok(Buffer.concat(ps))); rq.on('error', falha); });
const lerJson = async rq => { try { return JSON.parse((await lerCorpo(rq)).toString('utf8') || '{}'); } catch (e) { return null; } };

/* ---- contas ---- */
const renovaveis = new Map();                          // passe de renovação → id do usuário
function usuarioPublico(u) {
  return { id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, email_confirmed_at: u.created_at, phone: '', confirmed_at: u.created_at,
    last_sign_in_at: new Date().toISOString(), app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: u.raw_user_meta_data || {},
    identities: [], created_at: u.created_at, updated_at: u.created_at, is_anonymous: false };
}
function sessao(u) {
  const exp = agora() + UMA_HORA, renova = crypto.randomBytes(18).toString('base64url');
  renovaveis.set(renova, u.id);
  return { access_token: assinar({ aud: 'authenticated', role: 'authenticated', sub: u.id, email: u.email, iss: 'tinycats-local', iat: agora(), exp, session_id: crypto.randomUUID() }),
    token_type: 'bearer', expires_in: UMA_HORA, expires_at: exp, refresh_token: renova, user: usuarioPublico(u) };
}
const contaPor = async filtro => { const r = await banco('GET', '/users?' + filtro + '&limit=1', { perfil: 'auth' }); return r.ok && Array.isArray(r.dados) ? r.dados[0] || null : null; };
async function contas(rq, rs, rota, q) {
  if (rota === '/token' && rq.method === 'POST') {
    const c = await lerJson(rq) || {};
    if (q.get('grant_type') === 'password') {
      const u = await contaPor('email=eq.' + encodeURIComponent(String(c.email || '').trim().toLowerCase()));
      if (!u || u.senha !== String(c.password || '')) return json(rq, rs, 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
      return json(rq, rs, 200, sessao(u));
    }
    if (q.get('grant_type') === 'refresh_token') {
      const id = renovaveis.get(String(c.refresh_token || '')), u = id ? await contaPor('id=eq.' + id) : null;
      if (!u) return json(rq, rs, 400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token: Refresh Token Not Found' });
      renovaveis.delete(String(c.refresh_token));
      return json(rq, rs, 200, sessao(u));
    }
    return json(rq, rs, 400, { code: 400, error_code: 'unsupported_grant_type', msg: 'unsupported_grant_type' });
  }
  if (rota === '/user' && rq.method === 'GET') {
    const c = lerPasse(passeDe(rq)), u = c && c.sub ? await contaPor('id=eq.' + c.sub) : null;
    if (!u) return json(rq, rs, 401, { code: 401, error_code: 'bad_jwt', msg: 'invalid JWT: unable to parse or verify signature' });
    return json(rq, rs, 200, usuarioPublico(u));
  }
  if (rota === '/logout' && rq.method === 'POST') { rs.writeHead(204, cors(rq)); return rs.end(); }
  return json(rq, rs, 404, { code: 404, msg: 'A porta local não tem este pedido de contas: ' + rq.method + ' ' + rota });
}

/* ---- funções: criar-conta (como supabase/functions/criar-conta) e faxina ---- */
async function funcoes(rq, rs, rota) {
  if (rq.method !== 'POST') return json(rq, rs, 405, { erro: 'Método não permitido.' });
  if (rota === '/criar-conta') {
    if (!rq.headers.apikey) return json(rq, rs, 401, { erro: 'Pedido sem a chave do site.' });
    const c = await lerJson(rq);
    if (!c) return json(rq, rs, 400, { erro: 'Pedido inválido.' });
    const email = String(c.email || '').trim().toLowerCase(), senha = String(c.senha || ''), nome = String(c.nome || '').trim().slice(0, 40);
    if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json(rq, rs, 400, { erro: 'Digite um e-mail válido.' });
    if (senha.length < 8 || senha.length > 72) return json(rq, rs, 400, { erro: 'A senha precisa ter de 8 a 72 caracteres.' });
    if (!nome) return json(rq, rs, 400, { erro: 'Diga como você quer ser chamado.' });
    const r = await banco('POST', '/users', { perfil: 'auth', corpo: { email, senha, raw_user_meta_data: { nome } }, prefer: 'return=representation' });
    if (r.status === 409) return json(rq, rs, 409, { erro: 'Já existe uma conta com este e-mail. Use Entrar.' });
    if (!r.ok) return json(rq, rs, 500, { erro: 'Não foi possível criar a conta agora. Tente de novo.' });
    return json(rq, rs, 200, { ok: true, id: (r.dados[0] || {}).id || null });
  }
  if (rota === '/faxina') return json(rq, rs, lerPasse(passeDe(rq)) ? 200 : 401, lerPasse(passeDe(rq)) ? { ok: true, pastas: 0, arquivos: 0, poupadas: 0 } : { erro: 'Entre na sua conta.' });
  return json(rq, rs, 404, { erro: 'A porta local não tem esta função: ' + rota });
}

/* ---- arquivos (o balde "mesas") ---- */
const noDisco = (balde, nome) => path.join(ARQUIVOS, crypto.createHash('sha256').update(balde + '/' + nome).digest('hex'));
// (como o armazenamento do Supabase responde: quase todo erro sai com o código 400, e o motivo vai dentro, em statusCode)
const erroArq = (rq, rs, status, msg) => json(rq, rs, status === 413 || status === 415 ? status : 400,
  { statusCode: String(status), error: status === 403 ? 'Unauthorized' : status === 404 ? 'not_found' : status === 409 ? 'Duplicate' : 'Error', message: msg });
async function arquivos(rq, rs, rota) {
  const passe = passeDe(rq), quem = lerPasse(passe);
  let m;
  // ler: o balde é público (quem tem o endereço lê)
  if ((m = /^\/object\/public\/([^/]+)\/(.+)$/.exec(rota)) && (rq.method === 'GET' || rq.method === 'HEAD')) {
    const nome = decodeURIComponent(m[2]), r = await banco('GET', '/objects?bucket_id=eq.' + encodeURIComponent(m[1]) + '&name=eq.' + encodeURIComponent(nome) + '&select=metadata&limit=1', { perfil: 'storage' });
    const linha = r.ok && r.dados[0], arq = noDisco(m[1], nome);
    if (!linha || !fs.existsSync(arq)) return erroArq(rq, rs, 404, 'Object not found');
    const buf = fs.readFileSync(arq);
    rs.writeHead(200, cors(rq, { 'Content-Type': (linha.metadata && linha.metadata.mimetype) || 'application/octet-stream', 'Content-Length': buf.length, 'Cache-Control': 'max-age=31536000' }));
    return rs.end(rq.method === 'HEAD' ? undefined : buf);
  }
  if (!quem) return erroArq(rq, rs, 403, 'new row violates row-level security policy');
  // listar o que há numa pasta (os arquivos dela e as subpastas, como o Supabase devolve)
  if ((m = /^\/object\/list\/([^/]+)$/.exec(rota)) && rq.method === 'POST') {
    const c = await lerJson(rq) || {}, pre = String(c.prefix || '').replace(/\/+$/, ''), base = pre ? pre + '/' : '';
    const r = await banco('GET', '/objects?bucket_id=eq.' + encodeURIComponent(m[1]) + '&name=like.' + encodeURIComponent(base.replace(/[%_\\]/g, x => '\\' + x) + '*') + '&select=id,name,metadata,created_at,updated_at&order=name', { perfil: 'storage', passe });
    if (!r.ok) return erroArq(rq, rs, 500, 'Não deu para listar.');
    const vistos = new Set(), out = [];
    for (const l of r.dados) {
      const resto = l.name.slice(base.length), i = resto.indexOf('/'), nome = i < 0 ? resto : resto.slice(0, i);
      if (!nome || vistos.has(nome)) continue;
      vistos.add(nome);
      out.push(i < 0 ? { name: nome, id: l.id, updated_at: l.updated_at, created_at: l.created_at, last_accessed_at: l.updated_at, metadata: l.metadata } : { name: nome, id: null, updated_at: null, created_at: null, last_accessed_at: null, metadata: null });
    }
    const de = Number(c.offset) || 0, n = Number(c.limit) || 100;
    return json(rq, rs, 200, out.slice(de, de + n));
  }
  // apagar vários (só some o que quem pede pode apagar: o banco decide)
  if ((m = /^\/object\/([^/]+)$/.exec(rota)) && rq.method === 'DELETE') {
    const c = await lerJson(rq) || {}, nomes = (Array.isArray(c.prefixes) ? c.prefixes : []).map(String);
    if (!nomes.length) return json(rq, rs, 200, []);
    const lista = nomes.map(n => '"' + n.replace(/["\\]/g, x => '\\' + x) + '"').join(',');
    const r = await banco('DELETE', '/objects?bucket_id=eq.' + encodeURIComponent(m[1]) + '&name=in.(' + encodeURIComponent(lista) + ')', { perfil: 'storage', passe, prefer: 'return=representation' });
    if (!r.ok) return erroArq(rq, rs, 500, 'Não deu para apagar.');
    for (const l of r.dados) { try { fs.unlinkSync(noDisco(m[1], l.name)); } catch (e) { /* já não estava */ } }
    return json(rq, rs, 200, r.dados.map(l => ({ name: l.name, bucket_id: l.bucket_id, id: l.id })));
  }
  // enviar (POST: novo; PUT ou x-upsert: troca)
  if ((m = /^\/object\/([^/]+)\/(.+)$/.exec(rota)) && (rq.method === 'POST' || rq.method === 'PUT')) {
    const balde = m[1], nome = decodeURIComponent(m[2]);
    let buf = await lerCorpo(rq), tipo = String(rq.headers['content-type'] || '').split(';')[0].trim();
    // o supabase-js manda o arquivo num formulário (multipart): tira o arquivo de dentro dele
    if (tipo === 'multipart/form-data') {
      const mm = /boundary=(?:"([^"]+)"|([^;]+))/.exec(rq.headers['content-type']) || [], sep = mm[1] || mm[2];
      for (const p of sep ? buf.toString('latin1').split('--' + sep) : []) {
        const fim = p.indexOf('\r\n\r\n');
        if (fim < 0 || !/filename=/i.test(p.slice(0, fim))) continue;
        tipo = ((/content-type:\s*([^\r\n;]+)/i.exec(p.slice(0, fim)) || [])[1] || 'application/octet-stream').trim();
        buf = Buffer.from(p.slice(fim + 4).replace(/\r\n$/, ''), 'latin1');
        break;
      }
    }
    const b = await banco('GET', '/buckets?id=eq.' + encodeURIComponent(balde) + '&limit=1', { perfil: 'storage' });
    const regra = b.ok && b.dados[0];
    if (!regra) return erroArq(rq, rs, 404, 'Bucket not found');
    if (regra.file_size_limit && buf.length > regra.file_size_limit) return erroArq(rq, rs, 413, 'The object exceeded the maximum allowed size');
    if (Array.isArray(regra.allowed_mime_types) && regra.allowed_mime_types.length && !regra.allowed_mime_types.includes(tipo)) return erroArq(rq, rs, 415, 'mime type ' + tipo + ' is not supported');
    const troca = rq.method === 'PUT' || String(rq.headers['x-upsert'] || '') === 'true';
    const linha = { bucket_id: balde, name: nome, owner: quem.sub, owner_id: quem.sub, metadata: { mimetype: tipo, size: buf.length } };
    const r = await banco('POST', '/objects' + (troca ? '?on_conflict=bucket_id,name' : ''), { perfil: 'storage', passe, corpo: linha, prefer: 'return=representation' + (troca ? ',resolution=merge-duplicates' : '') });
    if (r.status === 409) return erroArq(rq, rs, 409, 'The resource already exists');
    if (!r.ok) return erroArq(rq, rs, 403, 'new row violates row-level security policy');
    fs.writeFileSync(noDisco(balde, nome), buf);
    return json(rq, rs, 200, { Key: balde + '/' + nome, Id: (r.dados[0] || {}).id || null });
  }
  return erroArq(rq, rs, 404, 'A porta local não tem este pedido de arquivos: ' + rq.method + ' ' + rota);
}

/* ---- o resto vai para o PostgREST ---- */
async function repassar(rq, rs, caminho) {
  const corpo = rq.method === 'GET' || rq.method === 'HEAD' ? undefined : await lerCorpo(rq);
  const h = {};
  for (const k of ['accept', 'content-type', 'prefer', 'range', 'range-unit', 'accept-profile', 'content-profile']) if (rq.headers[k]) h[k] = rq.headers[k];
  // (sem conta, o site manda a chave pública no lugar do passe: aí o pedido vai como visitante)
  const passe = passeDe(rq);
  if (passe.split('.').length === 3) h.authorization = 'Bearer ' + passe;
  let r;
  try { r = await fetch(REST + caminho, { method: rq.method, headers: h, body: corpo && corpo.length ? corpo : undefined }); }
  catch (e) { return json(rq, rs, 502, { message: 'O PostgREST local não respondeu.' }); }
  const buf = Buffer.from(await r.arrayBuffer()), saida = {};
  for (const k of ['content-type', 'content-range', 'content-location', 'location', 'preference-applied', 'range-unit']) { const v = r.headers.get(k); if (v) saida[k] = v; }
  saida['Content-Length'] = buf.length;
  rs.writeHead(r.status, cors(rq, saida));
  rs.end(rq.method === 'HEAD' ? undefined : buf);
}

/* Atende em HTTPS (com o certificado que banco.sh faz, só desta máquina: os testes o aceitam), para os endereços das
   imagens começarem com https:// como os de verdade. Sem certificado, em HTTP. */
const CERT = process.env.TC_CERT, CHAVE = process.env.TC_CHAVE, seguro = !!(CERT && CHAVE);
const criar = f => (seguro ? https.createServer({ cert: fs.readFileSync(CERT), key: fs.readFileSync(CHAVE) }, f) : http.createServer(f));
const servidor = criar((rq, rs) => {
  (async () => {
    const u = new URL(rq.url, 'http://local'), p = u.pathname;
    if (rq.method === 'OPTIONS') { rs.writeHead(204, cors(rq)); return rs.end(); }
    if (p === '/saude') return json(rq, rs, 200, { ok: true });
    if (p.startsWith('/rest/v1')) return repassar(rq, rs, (p.slice('/rest/v1'.length) || '/') + u.search);
    if (p.startsWith('/auth/v1/')) return contas(rq, rs, p.slice('/auth/v1'.length), u.searchParams);
    if (p.startsWith('/functions/v1/')) return funcoes(rq, rs, p.slice('/functions/v1'.length));
    if (p.startsWith('/storage/v1/')) return arquivos(rq, rs, p.slice('/storage/v1'.length));
    return json(rq, rs, 404, { message: 'A porta local não tem isto: ' + p });
  })().catch(e => { console.error(e); try { json(rq, rs, 500, { message: 'A porta local falhou: ' + ((e && e.message) || e) }); } catch (x) { /* a resposta já tinha começado */ } });
});
// o tempo real (um WebSocket) não existe aqui: a ligação é recusada, e o site segue pela leitura periódica
servidor.on('upgrade', (rq, soquete) => { soquete.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\nContent-Length: 0\r\n\r\n'); });
servidor.listen(PORTA, '127.0.0.1', () => console.log('porta local em http' + (seguro ? 's' : '') + '://127.0.0.1:' + PORTA + ' → ' + REST));
