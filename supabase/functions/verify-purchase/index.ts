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
 * Stores purchaseToken and purchaseTime. Does NOT consume the purchase.
 * Consumption happens client-side after the 24h candle expires.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    const { purchaseToken, orderId, productId, purchaseTime, purpose } = await req.json();

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

    // Check that user doesn't already have an active candle (completed or pending)
    const { data: activeCandle } = await supabaseAdmin
      .from("candle_purchases")
      .select("id, expires_at, payment_status")
      .eq("user_id", user.id)
      .in("payment_status", ["completed", "pending"])
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();

    if (activeCandle) {
      return new Response(
        JSON.stringify({ error: "User already has an active candle", candleId: activeCandle.id }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record the candle purchase with purchaseToken and purchaseTime
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
