import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Run pilgrimage reminders (3 days before)
    const { error: reminderError } = await supabase.rpc("notify_pilgrimage_reminders");
    if (reminderError) {
      console.error("Pilgrimage reminders error:", reminderError);
    }

    // Run candle expiry notifications
    const { error: candleError } = await supabase.rpc("notify_candle_expiry");
    if (candleError) {
      console.error("Candle expiry error:", candleError);
    }

    // After creating in-app notifications, send push notifications
    // Get recent unread notifications created in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentNotifs } = await supabase
      .from("notifications")
      .select("user_id, title, message, type, data")
      .eq("read", false)
      .gte("created_at", fiveMinutesAgo)
      .in("type", ["pilgrimage_reminder", "candle_expiry"]);

    if (recentNotifs && recentNotifs.length > 0) {
      // Group by user for batch sending
      const userNotifs = new Map<string, { title: string; body: string; data?: Record<string, string> }>();
      for (const n of recentNotifs) {
        // Only send the first notification per user to avoid spam
        if (!userNotifs.has(n.user_id)) {
          // Determine route based on notification type and data
          const notifData = (n.data || {}) as Record<string, any>;
          let route = "/dashboard";
          if (n.type === "pilgrimage_reminder" && notifData.pilgrimage_id) {
            route = `/pilgrimage/${notifData.pilgrimage_id}`;
          } else if (n.type === "candle_expiry") {
            route = "/candle";
          } else if (n.type === "comment_reply" && notifData.pilgrimage_id) {
            route = `/pilgrimage/${notifData.pilgrimage_id}`;
          }

          userNotifs.set(n.user_id, {
            title: n.title,
            body: n.message || "",
            data: { type: n.type, route },
          });
        }
      }

      // Send push notifications via send-push function
      const pushSecret = Deno.env.get("SEND_PUSH_SECRET") || "";
      for (const [userId, notif] of userNotifs) {
        try {
          await supabase.functions.invoke("send-push", {
            body: {
              user_ids: [userId],
              title: notif.title,
              body: notif.body,
              data: notif.data,
            },
            headers: {
              "x-send-push-secret": pushSecret,
            },
          });
        } catch (pushErr) {
          console.error("Push send error for user", userId, pushErr);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Scheduled notifications error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
