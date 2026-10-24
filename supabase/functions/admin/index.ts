// Tiny Cats · administração do site (lote 27)
// Só quem está em public.admins usa: a função confere o JWT de quem chama, procura a pessoa em public.admins e só então
// age com a chave de serviço. Cada ação que muda alguma coisa fica em public.admin_registro.
//   { acao: 'resumo' }                              → { contas, mesas, cadastro, registro, eu }
//   { acao: 'senha', id, senha }                    → troca a senha e marca a conta para pedir uma nova no próximo login
//   { acao: 'editar', id, nome?, email? }           → o nome (na conta e nas mesas) e o e-mail (já confirmado)
//   { acao: 'apagar', id }                          → apaga a conta (nunca a de um administrador nem a de dono de mesa)
//   { acao: 'cadastro', aberto, teto }              → abre ou fecha o cadastro de contas novas e muda o teto
//   As mesas (a auditoria: o administrador entra sem aparecer — ver 0022_auditoria_de_mesa.sql):
//   { acao: 'mesa', id }                            → os detalhes: participantes, campanhas, o que há nela, os arquivos
//   { acao: 'entrar', id, modo: 'ver'|'mestre' }    → abre a sessão de auditoria (12 horas) e anota no registro
//   { acao: 'sair', id }                            → fecha a sessão
//   { acao: 'copia', id }                           → a cópia da mesa (JSON: a mesa, participantes, campanhas, fichas,
//                                                      documentos, a mesa ao vivo e a lista dos arquivos)
//   { acao: 'apagar-mesa', id, nome }               → apaga a mesa inteira e os arquivos dela (o nome confere)
//   { acao: 'dono', id, usuario }                   → passa a mesa para outro participante (o antigo vira jogador)
//   { acao: 'tirar', id, usuario }                  → tira alguém da mesa (não o dono)
//   { acao: 'papel', id, usuario, papel }           → jogador ou mestre auxiliar (com todas as abas)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ABAS = ["cenas", "mundo", "acampamento", "fichas", "arvore", "rolador", "jornal", "meditacao", "cla"];
const HORAS_DE_AUDITORIA = 12;
type Obj = Record<string, unknown>;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "Método não permitido." }, 405);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const passe = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const quem = await sb.auth.getUser(passe);
  const eu = quem.data?.user;
  if (quem.error || !eu) return json({ erro: "Entre na sua conta." }, 401);
  const adm = await sb.from("admins").select("usuario_id").eq("usuario_id", eu.id).maybeSingle();
  if (adm.error || !adm.data) return json({ erro: "Só quem administra o site usa este painel." }, 403);

  let c: Obj;
  try { c = await req.json(); } catch { return json({ erro: "Pedido inválido." }, 400); }
  const acao = String(c?.acao ?? "");
  const registrar = (a: string, alvoId: string | null, alvo: string, detalhe: Obj = {}) =>
    sb.from("admin_registro").insert({ admin_id: eu.id, admin_email: eu.email ?? "", acao: a, alvo_id: alvoId, alvo, detalhe });
  const conta = async (id: unknown) => {
    if (typeof id !== "string" || !UUID.test(id)) return null;
    const r = await sb.auth.admin.getUserById(id);
    return r.error ? null : r.data.user;
  };
  const nomeDe = (u: { email?: string; user_metadata?: Obj }) => String(u.user_metadata?.nome ?? "") || String(u.email ?? "").split("@")[0];

  try {
    if (acao === "resumo") {
      const contas: Obj[] = [];
      for (let p = 1; p <= 20; p++) {
        const r = await sb.auth.admin.listUsers({ page: p, perPage: 200 });
        if (r.error) throw r.error;
        for (const u of r.data.users) {
          contas.push({ id: u.id, email: u.email ?? "", nome: nomeDe(u), criada: u.created_at, acesso: u.last_sign_in_at ?? null,
            trocar: !!u.user_metadata?.trocar_senha, mesas: [] as Obj[], donoDe: 0 });
        }
        if (r.data.users.length < 200) break;
      }
      const [mm, ms, admins, cfg, reg] = await Promise.all([
        sb.from("mesa_membros").select("mesa_id, usuario_id, papel, nome, visto_em"),
        sb.from("mesas").select("id, nome, dono_id, criada_em, campanhas"),
        sb.from("admins").select("usuario_id"),
        sb.from("site_cfg").select("valor").eq("chave", "cadastro").maybeSingle(),
        sb.from("admin_registro").select("em, admin_email, acao, alvo, detalhe").order("em", { ascending: false }).limit(200),
      ]);
      for (const r of [mm, ms, admins, cfg, reg]) if (r.error) throw r.error;
      const porId = new Map(contas.map((x) => [x.id as string, x]));
      const ehAdmin = new Set((admins.data ?? []).map((a) => a.usuario_id));
      const mesas = (ms.data ?? []).map((m) => {
        const membros = (mm.data ?? []).filter((x) => x.mesa_id === m.id);
        const dono = porId.get(m.dono_id);
        if (dono) dono.donoDe = (dono.donoDe as number) + 1;
        for (const x of membros) {
          const ct = porId.get(x.usuario_id);
          if (ct) (ct.mesas as Obj[]).push({ id: m.id, nome: m.nome, papel: x.papel, nomeNaMesa: x.nome });
        }
        const visto = membros.map((x) => x.visto_em).filter(Boolean).sort().pop() ?? null;
        return { id: m.id, nome: m.nome, criada: m.criada_em, dono: dono ? dono.nome : "(conta apagada)", donoEmail: dono ? dono.email : "",
          membros: membros.map((x) => ({ nome: x.nome, papel: x.papel })), visto };
      });
      for (const x of contas) x.admin = ehAdmin.has(x.id as string);
      return json({ contas, mesas, cadastro: cfg.data?.valor ?? { aberto: true, teto: 300 }, registro: reg.data ?? [], eu: eu.id });
    }

    if (acao === "senha") {
      const u = await conta(c.id);
      if (!u) return json({ erro: "Essa conta não existe." }, 404);
      const senha = String(c.senha ?? "");
      if (senha.length < 6 || senha.length > 72) return json({ erro: "A senha provisória precisa ter de 6 a 72 caracteres." }, 400);
      const r = await sb.auth.admin.updateUserById(u.id, { password: senha, user_metadata: { ...(u.user_metadata ?? {}), trocar_senha: true } });
      if (r.error) throw r.error;
      await registrar("senha", u.id, `${nomeDe(u)} <${u.email}>`, { trocarNoProximoLogin: true });
      return json({ ok: true });
    }

    if (acao === "editar") {
      const u = await conta(c.id);
      if (!u) return json({ erro: "Essa conta não existe." }, 404);
      const nome = c.nome == null ? null : String(c.nome).trim().slice(0, 40);
      const email = c.email == null ? null : String(c.email).trim().toLowerCase();
      if (nome !== null && !nome) return json({ erro: "O nome não pode ficar vazio." }, 400);
      if (email !== null && (email.length > 120 || !EMAIL.test(email))) return json({ erro: "Digite um e-mail válido." }, 400);
      const mudou: Obj = {};
      const campos: Obj = {};
      if (nome !== null && nome !== nomeDe(u)) { campos.user_metadata = { ...(u.user_metadata ?? {}), nome }; mudou.nome = { de: nomeDe(u), para: nome }; }
      if (email !== null && email !== (u.email ?? "")) { campos.email = email; campos.email_confirm = true; mudou.email = { de: u.email, para: email }; }
      if (!Object.keys(campos).length) return json({ ok: true, nada: true });
      const r = await sb.auth.admin.updateUserById(u.id, campos);
      if (r.error) return json({ erro: /already|registered|exists/i.test(r.error.message ?? "") ? "Já existe outra conta com esse e-mail." : "Não deu para salvar agora." }, 400);
      // o nome também nas mesas (é o que os outros veem na lista de participantes)
      if (mudou.nome) await sb.from("mesa_membros").update({ nome }).eq("usuario_id", u.id);
      await registrar("editar", u.id, `${nomeDe(u)} <${u.email}>`, mudou);
      return json({ ok: true });
    }

    if (acao === "apagar") {
      const u = await conta(c.id);
      if (!u) return json({ erro: "Essa conta não existe." }, 404);
      if (u.id === eu.id) return json({ erro: "Você não pode apagar a sua própria conta por aqui." }, 400);
      const a = await sb.from("admins").select("usuario_id").eq("usuario_id", u.id).maybeSingle();
      if (a.data) return json({ erro: "Essa conta é de um administrador." }, 400);
      const dono = await sb.from("mesas").select("id", { count: "exact", head: true }).eq("dono_id", u.id);
      if ((dono.count ?? 0) > 0) return json({ erro: "Essa conta é dona de " + dono.count + (dono.count === 1 ? " mesa" : " mesas") + ": apagar a conta apagaria a mesa inteira. Apague ou passe a mesa antes." }, 400);
      const r = await sb.auth.admin.deleteUser(u.id);
      if (r.error) throw r.error;
      await registrar("apagar", u.id, `${nomeDe(u)} <${u.email}>`);
      return json({ ok: true });
    }

    if (acao === "cadastro") {
      const aberto = !!c.aberto, teto = Math.round(Number(c.teto));
      if (!Number.isFinite(teto) || teto < 1 || teto > 100000) return json({ erro: "O teto precisa ser um número de 1 a 100000." }, 400);
      const antes = await sb.from("site_cfg").select("valor").eq("chave", "cadastro").maybeSingle();
      const r = await sb.from("site_cfg").upsert({ chave: "cadastro", valor: { aberto, teto }, em: new Date().toISOString() });
      if (r.error) throw r.error;
      await registrar("cadastro", null, "o cadastro do site", { de: antes.data?.valor ?? null, para: { aberto, teto } });
      return json({ ok: true });
    }

    /* ---- as mesas ---- */
    const mesaDe = async (id: unknown) => {
      if (typeof id !== "string" || !UUID.test(id)) return null;
      const r = await sb.from("mesas").select("*").eq("id", id).maybeSingle();
      return r.data ?? null;
    };
    // os arquivos da mesa (a pasta com o id dela, com as subpastas)
    const arquivos = async (pasta: string): Promise<{ nome: string; tam: number }[]> => {
      const out: { nome: string; tam: number }[] = [];
      for (let off = 0; ; off += 1000) {
        const r = await sb.storage.from("mesas").list(pasta, { limit: 1000, offset: off });
        if (r.error) throw r.error;
        for (const x of r.data ?? []) {
          if (x.id) out.push({ nome: pasta + "/" + x.name, tam: Number((x.metadata as Obj | null)?.size ?? 0) });
          else out.push(...await arquivos(pasta + "/" + x.name));
        }
        if ((r.data ?? []).length < 1000) break;
      }
      return out;
    };
    const membro = async (mesa: string, usuario: unknown) => {
      if (typeof usuario !== "string" || !UUID.test(usuario)) return null;
      const r = await sb.from("mesa_membros").select("*").eq("mesa_id", mesa).eq("usuario_id", usuario).maybeSingle();
      return r.data ?? null;
    };

    if (acao === "mesa") {
      const m = await mesaDe(c.id);
      if (!m) return json({ erro: "Essa mesa não existe mais." }, 404);
      const [mm, cs, cm, pcs, docs, reg, ult, cv, aud] = await Promise.all([
        sb.from("mesa_membros").select("usuario_id, papel, nome, jogando, abas, visto_em, entrou_em").eq("mesa_id", m.id).order("entrou_em"),
        sb.from("campanhas").select("id, nome, encerrada, ordem").eq("mesa_id", m.id).order("ordem"),
        sb.from("campanha_membros").select("campanha_id, usuario_id").eq("mesa_id", m.id),
        sb.from("personagens").select("id, dono_id, apagado").eq("mesa_id", m.id),
        sb.from("documentos").select("id, apagado, atualizado_em").eq("mesa_id", m.id),
        sb.from("registro").select("id", { count: "exact", head: true }).eq("mesa_id", m.id),
        sb.from("registro").select("criado_em").eq("mesa_id", m.id).order("criado_em", { ascending: false }).limit(1),
        sb.from("mesa_convites").select("codigo").eq("mesa_id", m.id).maybeSingle(),
        sb.from("admin_auditoria").select("modo, ate").eq("mesa_id", m.id).eq("admin_id", eu.id).maybeSingle(),
      ]);
      for (const r of [mm, cs, cm, pcs, docs, reg, ult]) if (r.error) throw r.error;
      const emails = new Map<string, string>();
      for (const x of mm.data ?? []) { const u = await conta(x.usuario_id); if (u) emails.set(x.usuario_id, u.email ?? ""); }
      const tipo = (id: string) => /^cenas?:/.test(id) ? "Cenas" : id.startsWith("mundo:") ? "Mapa-múndi" : id.startsWith("acampamento") ? "Acampamento"
        : id.startsWith("fichas:") ? "Fichas" : id.startsWith("arvore:") ? "Árvore" : id.startsWith("rol:") ? "Rolador" : id.startsWith("jornal:") ? "Jornal"
        : id.startsWith("medit:") ? "Meditação" : id.startsWith("cla:") ? "Clã" : id.startsWith("notas:") ? "Notas do mestre" : "Outros";
      const porTipo: Record<string, number> = {};
      for (const d of docs.data ?? []) if (!d.apagado) porTipo[tipo(d.id)] = (porTipo[tipo(d.id)] ?? 0) + 1;
      let arqs: { nome: string; tam: number }[] = [];
      try { arqs = await arquivos(m.id); } catch (_e) { /* sem a lista dos arquivos: segue sem */ }
      const vivos = (pcs.data ?? []).filter((p) => !p.apagado);
      const ultimoDoc = (docs.data ?? []).map((d) => d.atualizado_em).filter(Boolean).sort().pop() ?? null;
      return json({
        id: m.id, nome: m.nome, dono_id: m.dono_id, criada: m.criada_em, codigo: cv.data?.codigo ?? null,
        membros: (mm.data ?? []).map((x) => ({ ...x, email: emails.get(x.usuario_id) ?? "", campanhas: (cm.data ?? []).filter((y) => y.usuario_id === x.usuario_id).map((y) => y.campanha_id) })),
        campanhas: cs.data ?? [],
        fichas: { total: vivos.length, deJogadores: vivos.filter((p) => p.dono_id).length, npcs: vivos.filter((p) => !p.dono_id).length },
        documentos: porTipo, registro: reg.count ?? 0, ultimaFala: ult.data?.[0]?.criado_em ?? null, ultimaMudanca: ultimoDoc,
        arquivos: { total: arqs.length, bytes: arqs.reduce((t, a) => t + a.tam, 0) },
        auditoria: aud.data && new Date(aud.data.ate) > new Date() ? aud.data : null,
      });
    }

    if (acao === "entrar") {
      const m = await mesaDe(c.id);
      if (!m) return json({ erro: "Essa mesa não existe mais." }, 404);
      const modo = c.modo === "mestre" ? "mestre" : "ver";
      const ate = new Date(Date.now() + HORAS_DE_AUDITORIA * 3600_000).toISOString();
      const r = await sb.from("admin_auditoria").upsert({ admin_id: eu.id, mesa_id: m.id, modo, ate });
      if (r.error) throw r.error;
      await registrar(modo === "mestre" ? "entrar-mestre" : "entrar-ver", null, m.nome, { mesa: m.id, ate });
      return json({ ok: true, modo, ate });
    }

    if (acao === "sair") {
      if (typeof c.id === "string" && UUID.test(c.id)) await sb.from("admin_auditoria").delete().eq("admin_id", eu.id).eq("mesa_id", c.id);
      return json({ ok: true });
    }

    if (acao === "copia") {
      const m = await mesaDe(c.id);
      if (!m) return json({ erro: "Essa mesa não existe mais." }, 404);
      const tudo = async (tabela: string, ordem: string) => {
        const out: Obj[] = [];
        for (let off = 0; ; off += 1000) {
          const r = await sb.from(tabela).select("*").eq("mesa_id", m.id).order(ordem).range(off, off + 999);
          if (r.error) throw r.error;
          out.push(...(r.data ?? []));
          if ((r.data ?? []).length < 1000) break;
        }
        return out;
      };
      const [membros, campanhas, campanhaMembros, personagens, documentos, registro] = await Promise.all([
        tudo("mesa_membros", "entrou_em"), tudo("campanhas", "id"), tudo("campanha_membros", "campanha_id"),
        tudo("personagens", "id"), tudo("documentos", "id"), tudo("registro", "criado_em"),
      ]);
      let arqs: { nome: string; tam: number }[] = [];
      try { arqs = await arquivos(m.id); } catch (_e) { /* sem a lista */ }
      await registrar("copia", null, m.nome, { mesa: m.id });
      return json({ formato: "tinycats-mesa", versao: 1, em: new Date().toISOString(), mesa: m, membros, campanhas, campanhaMembros, personagens, documentos, registro,
        arquivos: arqs.map((a) => ({ caminho: a.nome, bytes: a.tam })) });
    }

    if (acao === "apagar-mesa") {
      const m = await mesaDe(c.id);
      if (!m) return json({ erro: "Essa mesa não existe mais." }, 404);
      if (String(c.nome ?? "").trim() !== String(m.nome).trim()) return json({ erro: "O nome digitado não é o da mesa." }, 400);
      let apagados = 0;
      try {
        const arqs = await arquivos(m.id);
        for (let i = 0; i < arqs.length; i += 100) {
          const r = await sb.storage.from("mesas").remove(arqs.slice(i, i + 100).map((a) => a.nome));
          if (!r.error) apagados += Math.min(100, arqs.length - i);
        }
      } catch (_e) { /* o que sobrar, a faxina leva depois */ }
      const r = await sb.from("mesas").delete().eq("id", m.id);
      if (r.error) throw r.error;
      await registrar("apagar-mesa", null, m.nome, { mesa: m.id, arquivos: apagados });
      return json({ ok: true });
    }

    if (acao === "dono" || acao === "tirar" || acao === "papel") {
      const m = await mesaDe(c.id);
      if (!m) return json({ erro: "Essa mesa não existe mais." }, 404);
      const x = await membro(m.id, c.usuario);
      if (!x) return json({ erro: "Essa pessoa não participa desta mesa." }, 404);
      if (acao === "dono") {
        if (x.usuario_id === m.dono_id) return json({ ok: true, nada: true });
        const r1 = await sb.from("mesas").update({ dono_id: x.usuario_id }).eq("id", m.id);
        if (r1.error) throw r1.error;
        await sb.from("mesa_membros").update({ papel: "jogador", abas: [], jogando: false }).eq("mesa_id", m.id).eq("papel", "mestre");
        const r2 = await sb.from("mesa_membros").update({ papel: "mestre", abas: [], jogando: false }).eq("mesa_id", m.id).eq("usuario_id", x.usuario_id);
        if (r2.error) throw r2.error;
        await registrar("dono", x.usuario_id, m.nome, { mesa: m.id, novoDono: x.nome });
        return json({ ok: true });
      }
      if (x.usuario_id === m.dono_id || x.papel === "mestre") return json({ erro: "Essa pessoa é o mestre da mesa: passe a mesa para outra pessoa antes." }, 400);
      if (acao === "tirar") {
        await sb.from("campanha_membros").delete().eq("mesa_id", m.id).eq("usuario_id", x.usuario_id);
        const r = await sb.from("mesa_membros").delete().eq("mesa_id", m.id).eq("usuario_id", x.usuario_id);
        if (r.error) throw r.error;
        await registrar("tirar", x.usuario_id, m.nome, { mesa: m.id, quem: x.nome });
        return json({ ok: true });
      }
      const papel = c.papel === "auxiliar" ? "auxiliar" : "jogador";
      const r = await sb.from("mesa_membros").update(papel === "auxiliar" ? { papel, abas: ABAS, jogando: false } : { papel, abas: [], jogando: false })
        .eq("mesa_id", m.id).eq("usuario_id", x.usuario_id);
      if (r.error) throw r.error;
      await registrar("papel", x.usuario_id, m.nome, { mesa: m.id, quem: x.nome, de: x.papel, para: papel });
      return json({ ok: true });
    }

    return json({ erro: "Ação desconhecida." }, 400);
  } catch (e) {
    console.error("admin:", acao, (e as Error)?.message ?? e);
    return json({ erro: "Não deu certo agora. Tente de novo." }, 500);
  }
});
