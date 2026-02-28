import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Edge function to verify Google Play purchases server-side.
 * 
 * For MVP: validates the purchase data and records the candle.
 * For production: integrate Google Play Developer API with service account
 * credentials to verify the purchase token with Google servers.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create authenticated client to get user
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { purchaseToken, orderId, productId, purpose } = await req.json();

    if (!purchaseToken || !productId) {
      return new Response(
        JSON.stringify({ error: "Missing purchaseToken or productId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (productId !== "light_candle_5ron") {
      return new Response(
        JSON.stringify({ error: "Invalid product ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to check and insert
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check for duplicate purchase token
    const { data: existing } = await supabaseAdmin
      .from("candle_purchases")
      .select("id")
      .eq("purchase_token", purchaseToken)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "Purchase already processed", candleId: existing.id }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Google Play Developer API Verification ---
    // To enable full server-side verification:
    // 1. Create a Google Cloud service account with Play Developer API access
    // 2. Add GOOGLE_SERVICE_ACCOUNT_KEY secret with the JSON key
    // 3. Uncomment the verification code below
    //
    // const serviceAccountKey = JSON.parse(Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY") || "{}");
    // const packageName = "app.lovable.ee3834849f11481bad7f08d619b104bd";
    // const verifyUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${productId}/tokens/${purchaseToken}`;
    // const accessToken = await getAccessToken(serviceAccountKey);
    // const verifyResponse = await fetch(verifyUrl, {
    //   headers: { Authorization: `Bearer ${accessToken}` },
    // });
    // const verifyData = await verifyResponse.json();
    // if (verifyData.purchaseState !== 0) {
    //   return new Response(JSON.stringify({ error: "Purchase not valid" }), { status: 400 });
    // }

    // Record the candle purchase
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: candle, error: insertError } = await supabaseAdmin
      .from("candle_purchases")
      .insert({
        user_id: user.id,
        lit_at: now,
        expires_at: expiresAt,
        purpose: purpose || "Pentru pace și binecuvântare",
        amount: 5,
        payment_status: "completed",
        purchase_token: purchaseToken,
        order_id: orderId || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to record purchase" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, candle }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Verify purchase error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
