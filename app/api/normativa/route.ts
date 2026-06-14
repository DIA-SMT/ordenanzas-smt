import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { hasEnv } from "@/lib/env";

export const runtime = "nodejs";

export async function GET() {
  if (!hasEnv("SUPABASE_SERVICE_ROLE_KEY")) {
    return Response.json({ configured: false, items: [] });
  }
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("normativa_documentos")
      .select("id,titulo,tipo,numero,fecha,estado,metadata,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return Response.json({ configured: true, items: data ?? [] });
  } catch (e) {
    return Response.json({ configured: true, items: [], error: (e as Error).message }, { status: 500 });
  }
}
