// Tiny Cats · faxina
// Apaga do armazenamento as pastas de mesas que não existem mais. Os arquivos de uma mesa (mapas, tokens, retratos)
// moram numa pasta com o id dela; quando a mesa é apagada pelo site, a pasta vai junto. Isto é para o que sobrou de
// antes disso, ou de um apagar que parou no meio: depois que a mesa some, ninguém mais tem permissão sobre a pasta.
// Só mexe em pasta cujo nome é um id que NÃO é de nenhuma mesa, e só se todos os arquivos dela têm mais de uma hora
// (uma mesa recém-criada nunca é confundida com sobra). Quem chama precisa ter conta: o JWT é conferido aqui dentro.
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
const UMA_HORA = 3600_000;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "Método não permitido." }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const passe = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const quem = await admin.auth.getUser(passe);
  if (quem.error || !quem.data?.user) return json({ erro: "Entre na sua conta." }, 401);

  const balde = admin.storage.from("mesas");
  // as pastas da raiz do balde (uma por mesa)
  const raiz: string[] = [];
  for (let de = 0; de < 5000; de += 100) {
    const { data, error } = await balde.list("", { limit: 100, offset: de, sortBy: { column: "name", order: "asc" } });
    if (error) return json({ erro: "Não deu para ler o armazenamento." }, 500);
    for (const x of data ?? []) if (x?.name && !x.id) raiz.push(x.name);
    if (!data || data.length < 100) break;
  }

  let pastas = 0, arquivos = 0, poupadas = 0;
  const limite = Date.now() - UMA_HORA;
  for (const nome of raiz) {
    if (!UUID.test(nome)) continue;
    const mesa = await admin.from("mesas").select("id").eq("id", nome).maybeSingle();
    if (mesa.error || mesa.data) continue;               // a mesa existe (ou não deu para saber): não mexe

    // todos os arquivos da pasta, em qualquer profundidade (os retratos dos jogadores ficam em <mesa>/j/<jogador>/)
    const fila = [nome], caminhos: string[] = [];
    let poupar = false;
    while (fila.length && !poupar && caminhos.length < 5000) {
      const pasta = fila.shift()!;
      for (let de = 0; de < 5000; de += 100) {
        const { data, error } = await balde.list(pasta, { limit: 100, offset: de, sortBy: { column: "name", order: "asc" } });
        if (error) { poupar = true; break; }             // na dúvida, esta pasta fica
        for (const x of data ?? []) {
          if (!x?.name) continue;
          if (!x.id) fila.push(pasta + "/" + x.name);
          else { caminhos.push(pasta + "/" + x.name); if (Date.parse(x.created_at ?? "") > limite) poupar = true; }
        }
        if (!data || data.length < 100) break;
      }
    }
    if (poupar) { poupadas++; continue; }
    let saiu = 0;
    for (let i = 0; i < caminhos.length; i += 100) {
      const r = await balde.remove(caminhos.slice(i, i + 100));
      if (!r.error) saiu += (r.data ?? []).length;
    }
    if (saiu) { pastas++; arquivos += saiu; }
  }
  return json({ ok: true, pastas, arquivos, poupadas });
});
