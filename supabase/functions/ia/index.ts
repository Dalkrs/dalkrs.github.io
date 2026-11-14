// Tiny Cats · a IA do site (lote 150; lote 155: as pistas dos segredos)
// O site pede, a função confere quem pede e chama o Claude com a chave guardada nos segredos (ANTHROPIC_API_KEY): a chave
// nunca vai para o navegador. Só o mestre (ou o mestre auxiliar) de uma mesa liberada em public.ia_mesas usa, até o teto de
// pedidos do dia dela; cada pedido fica anotado em public.ia_uso.
//   { mesa, acao: 'mapa' | 'pistas', texto, sistema, ferramenta: { name, description, input_schema } }
//     → { ok: true, dados } (o que o Claude preencheu na ferramenta) | { erro }
// O pedido vem com o "sistema" (as instruções) e a ferramenta (o formato da resposta) montados pelo site, para o gerador
// evoluir sem mexer aqui; os tamanhos têm teto.
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
const ACOES = ["mapa", "pistas"];
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

  let c: Obj;
  try { c = await req.json(); } catch { return json({ erro: "Pedido inválido." }, 400); }
  const mesa = String(c?.mesa ?? ""), acao = String(c?.acao ?? "");
  if (!UUID.test(mesa)) return json({ erro: "Abra uma mesa primeiro." }, 400);
  if (!ACOES.includes(acao)) return json({ erro: "Pedido desconhecido." }, 400);

  // a mesa liberada e quem pede: o mestre ou o mestre auxiliar dela
  const lib = await sb.from("ia_mesas").select("ativo, teto_dia").eq("mesa_id", mesa).maybeSingle();
  if (lib.error || !lib.data || !lib.data.ativo) return json({ erro: "A IA não está liberada nesta mesa." }, 403);
  const membro = await sb.from("mesa_membros").select("papel").eq("mesa_id", mesa).eq("usuario_id", eu.id).maybeSingle();
  if (membro.error || !membro.data || !["mestre", "auxiliar"].includes(String(membro.data.papel))) return json({ erro: "Só o mestre da mesa usa a IA." }, 403);

  // o teto do dia (pelo relógio de Brasília)
  const hoje = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10) + "T03:00:00Z";
  const conta = await sb.from("ia_uso").select("id", { count: "exact", head: true }).eq("mesa_id", mesa).gte("em", hoje);
  const usados = conta.count ?? 0, teto = Number(lib.data.teto_dia) || 0;
  if (usados >= teto) return json({ erro: `A mesa já usou os ${teto} pedidos de IA de hoje. Amanhã volta.` }, 429);

  const chave = Deno.env.get("ANTHROPIC_API_KEY");
  if (!chave) return json({ erro: "A IA ainda não está ligada: falta a chave da API nos segredos do site.", semChave: true }, 503);

  const texto = String(c.texto ?? "").trim().slice(0, 4000);
  const sistema = String(c.sistema ?? "").slice(0, 40000);
  const f = (c.ferramenta ?? {}) as Obj;
  if (!texto) return json({ erro: acao === "pistas" ? "Escreva o segredo primeiro." : "Descreva o lugar primeiro." }, 400);
  if (!f || typeof f.name !== "string" || typeof f.input_schema !== "object" || JSON.stringify(f).length > 40000) return json({ erro: "Pedido inválido." }, 400);

  const modelo = Deno.env.get("IA_MODELO") || "claude-sonnet-5-5";
  let r: Response, corpo: Obj;
  try {
    r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": chave, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: modelo, max_tokens: 4000, system: sistema + "\n\nResponda SEMPRE chamando a ferramenta \"" + f.name + "\", uma vez, sem texto antes.",
        tools: [{ name: f.name, description: String(f.description ?? ""), input_schema: f.input_schema }],
        tool_choice: { type: "auto" },      // (o modelo não aceita forçar a ferramenta: as instruções pedem para chamá-la)
        messages: [{ role: "user", content: texto }],
      }),
    });
    corpo = await r.json();
  } catch (e) {
    await sb.from("ia_uso").insert({ mesa_id: mesa, usuario_id: eu.id, acao, ok: false });
    return json({ erro: "Não deu para falar com a IA agora. Tente de novo." }, 502);
  }
  const uso = (corpo?.usage ?? {}) as Obj;
  const ok = r.ok;
  await sb.from("ia_uso").insert({ mesa_id: mesa, usuario_id: eu.id, acao, ok, entrada: Number(uso.input_tokens) || 0, saida: Number(uso.output_tokens) || 0 });
  if (!ok) {
    const msg = String(((corpo?.error ?? {}) as Obj).message ?? "");
    return json({ erro: r.status === 401 ? "A chave da API não vale (confira o segredo ANTHROPIC_API_KEY)." : "A IA recusou o pedido: " + msg.slice(0, 200) }, 502);
  }
  const bloco = (Array.isArray(corpo.content) ? corpo.content : []).find((b: Obj) => b && b.type === "tool_use") as Obj | undefined;
  if (!bloco) return json({ erro: acao === "pistas" ? "A IA não devolveu as pistas. Tente de novo." : "A IA não devolveu o lugar. Tente descrever de outro jeito." }, 502);
  return json({ ok: true, dados: bloco.input, restam: Math.max(0, teto - usados - 1) });
});
