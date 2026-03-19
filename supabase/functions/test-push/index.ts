import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { user_id, token, title, body } = await req.json();

    // If user_id provided, look up their token(s)
    let targetTokens: string[] = [];

    if (token) {
      targetTokens = [token];
    } else if (user_id) {
      const { data: tokens, error } = await supabase
        .from("push_tokens")
        .select("token")
        .eq("user_id", user_id);

      if (error) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch tokens", details: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!tokens || tokens.length === 0) {
        return new Response(
          JSON.stringify({ error: "No push tokens found for this user", user_id }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      targetTokens = tokens.map((t: any) => t.token);
    } else {
      return new Response(
        JSON.stringify({ error: "Provide either 'user_id' or 'token'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[test-push] Sending to ${targetTokens.length} token(s)`);

    // Call send-push function
    const { data, error: invokeError } = await supabase.functions.invoke("send-push", {
      body: {
        user_ids: user_id ? [user_id] : undefined,
        title: title || "🔔 Test Notification",
        body: body || "Aceasta este o notificare de test din Pași de Pelerin!",
        data: { type: "test", route: "/dashboard" },
      },
    });

    if (invokeError) {
      console.error("[test-push] invoke error:", invokeError);
      return new Response(
        JSON.stringify({ error: "send-push invocation failed", details: invokeError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[test-push] send-push response:", JSON.stringify(data));

    return new Response(
      JSON.stringify({
        success: true,
        tokens_count: targetTokens.length,
        send_push_result: data,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[test-push] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
