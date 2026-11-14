// Tiny Cats · a IA do site — DESLIGADA (lote 160).
// O gerador de mapas e os Segredos não usam mais a IA. A função fica no ar só para responder que foi desligada:
// ela não chama o Claude e não usa a chave. As tabelas public.ia_mesas e public.ia_uso ficam como estão (nada apagado).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  return new Response(JSON.stringify({ erro: "A IA do site foi desligada." }), {
    status: 410,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
