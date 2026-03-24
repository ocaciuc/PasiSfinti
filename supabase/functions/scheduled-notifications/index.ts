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
      console.error("[scheduled-notifications] Pilgrimage reminders error:", reminderError);
    } else {
      console.log("[scheduled-notifications] Pilgrimage reminders check completed");
    }

    // Run candle expiry notifications
    const { error: candleError } = await supabase.rpc("notify_candle_expiry");
    if (candleError) {
      console.error("[scheduled-notifications] Candle expiry error:", candleError);
    } else {
      console.log("[scheduled-notifications] Candle expiry check completed");
    }

    // After creating in-app notifications, send push notifications
    // Get recent unread notifications created in the last 65 minutes
    // (cron runs hourly, so we check slightly more than 1 hour to avoid missing any)
    const windowAgo = new Date(Date.now() - 65 * 60 * 1000).toISOString();
    const { data: recentNotifs, error: notifError } = await supabase
      .from("notifications")
      .select("id, user_id, title, message, type, data")
      .eq("read", false)
      .gte("created_at", windowAgo)
      .in("type", ["pilgrimage_reminder", "candle_expiry"]);

    if (notifError) {
      console.error("[scheduled-notifications] Error fetching notifications:", notifError);
    }

    if (recentNotifs && recentNotifs.length > 0) {
      console.log(`[scheduled-notifications] Found ${recentNotifs.length} notification(s) to push`);

      // Group by user for batch sending
      const userNotifs = new Map<string, { title: string; body: string; data?: Record<string, string> }>();
      const notifIds: string[] = recentNotifs.map((n) => n.id);

      for (const n of recentNotifs) {
        // Only send the first notification per user to avoid spam
        if (!userNotifs.has(n.user_id)) {
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

      // Mark these notifications as read so they won't be pushed again on next cron run
      const { error: markError } = await supabase
        .from("notifications")
        .update({ read: true, read_at: new Date().toISOString() })
        .in("id", notifIds);

      if (markError) {
        console.error("[scheduled-notifications] Failed to mark notifications as read:", markError);
      }

      // Send push notifications via send-push function
      const pushSecret = Deno.env.get("SEND_PUSH_SECRET") || "";
      for (const [userId, notif] of userNotifs) {
        try {
          console.log(`[scheduled-notifications] Sending push to user ${userId}: "${notif.title}"`);
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
          console.error("[scheduled-notifications] Push send error for user", userId, pushErr);
        }
      }
    } else {
      console.log("[scheduled-notifications] No pending notifications to push");
    }

    return new Response(
      JSON.stringify({ success: true, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[scheduled-notifications] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
