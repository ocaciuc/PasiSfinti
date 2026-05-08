// One-shot admin endpoint to bulk-update orthodox_calendar_days.comments.
// Removed after running. Auth via shared secret header.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const expected = Deno.env.get("SEND_PUSH_SECRET") ?? "";
    if (req.headers.get("x-admin-secret") !== expected) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { updates } = await req.json() as { updates: Record<string, string> };
    if (!updates || typeof updates !== "object") {
      return new Response(JSON.stringify({ error: "missing updates" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const entries = Object.entries(updates);
    let ok = 0, err = 0;
    const errors: any[] = [];
    for (const [id, comments] of entries) {
      const { error } = await supabase
        .from("orthodox_calendar_days")
        .update({ comments })
        .eq("id", id);
      if (error) { err++; errors.push({ id, msg: error.message }); }
      else ok++;
    }
    return new Response(JSON.stringify({ ok, err, errors: errors.slice(0, 5) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
