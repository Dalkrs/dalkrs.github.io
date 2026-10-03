// Tiny Cats · criar conta
// Cria a conta já confirmada (e-mail + senha), sem depender de e-mail de confirmação.
// É um endereço público, como o cadastro normal: por isso a verificação de JWT fica desligada e a função
// confere, ela mesma, a chave pública do projeto, valida os campos e respeita um teto de contas.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CHAVES = new Set(
  ["sb_publishable_hEcYx7tSwvR1jw-6CVf6Vw_g_btjpDW", Deno.env.get("SUPABASE_ANON_KEY") ?? ""].filter(Boolean),
);
const TETO_DE_CONTAS = 300;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "Método não permitido." }, 405);
  if (!CHAVES.has(req.headers.get("apikey") ?? "")) return json({ erro: "Pedido sem a chave do site." }, 401);

  let corpo: Record<string, unknown>;
  try { corpo = await req.json(); } catch { return json({ erro: "Pedido inválido." }, 400); }
  const email = String(corpo?.email ?? "").trim().toLowerCase();
  const senha = String(corpo?.senha ?? "");
  const nome = String(corpo?.nome ?? "").trim().slice(0, 40);

  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ erro: "Digite um e-mail válido." }, 400);
  if (senha.length < 8 || senha.length > 72) return json({ erro: "A senha precisa ter de 8 a 72 caracteres." }, 400);
  if (!nome) return json({ erro: "Diga como você quer ser chamado." }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const lista = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
    const total = (lista.data as { total?: number } | null)?.total;
    if (typeof total === "number" && total >= TETO_DE_CONTAS) {
      return json({ erro: "O cadastro está fechado no momento. Fale com quem cuida do site." }, 403);
    }
  } catch (_e) { /* se não der para contar, segue: o teto é só uma trava contra abuso */ }

  const { data, error } = await admin.auth.admin.createUser({
    email, password: senha, email_confirm: true, user_metadata: { nome },
  });
  if (error) {
    const ja = /already|registered|exists/i.test(error.message ?? "");
    if (!ja) console.error("criar-conta:", error.message);
    return json({ erro: ja ? "Já existe uma conta com este e-mail. Use Entrar." : "Não foi possível criar a conta agora. Tente de novo." }, ja ? 409 : 500);
  }
  return json({ ok: true, id: data.user?.id ?? null });
});
