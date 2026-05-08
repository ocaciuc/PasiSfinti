// Daily holiday notification dispatcher.
// Runs once per day. If today is a "red" day in orthodox_calendar_days,
// sends a personalized push notification to all users with a profile.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Parse the holiday name from a description column.
 * - If today is Sunday → "Duminică"
 * - Else → first segment before ';', trimmed
 * - Empty → null (skip notification)
 */
export function parseHolidayName(description: string | null, date: Date): string | null {
  if (date.getDay() === 0) return "Duminică";
  if (!description) return null;
  const first = description.split(";")[0]?.trim();
  return first && first.length > 0 ? first : null;
}

/**
 * Build the personalized notification body.
 * Falls back to a generic phrasing when the user's first name is missing.
 */
export function buildHolidayMessage(firstName: string | null, holidayName: string): string {
  const safeName = firstName?.trim();
  if (safeName) {
    return `${safeName}, astăzi ne rugăm pentru sfânta zi ${holidayName}.`;
  }
  return `Astăzi ne rugăm pentru sfânta zi ${holidayName}.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const pushSecret = Deno.env.get("SEND_PUSH_SECRET") ?? "";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Use Romania local time to determine "today" so the run at 08:00 UTC+02/03
    // resolves to the correct calendar date for Romanian users.
    const now = new Date();
    const ro = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Bucharest" }));
    const year = ro.getFullYear();
    const month = ro.getMonth() + 1;
    const day = ro.getDate();
    const isoDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    console.log(`[holiday-notifications] Checking ${isoDate} (Bucharest)`);

    // Multiple records → pick the first
    const { data: holidayRows, error: holidayErr } = await supabase
      .from("orthodox_calendar_days")
      .select("description, color, comments, post")
      .eq("year", year)
      .eq("month", month)
      .eq("day_number", day)
      .eq("color", "red")
      .limit(1);

    if (holidayErr) throw holidayErr;
    if (!holidayRows || holidayRows.length === 0) {
      console.log("[holiday-notifications] No red holiday today, skipping");
      return new Response(JSON.stringify({ skipped: "no_holiday" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const holiday = holidayRows[0];
    const holidayName = parseHolidayName(holiday.description, ro);
    if (!holidayName) {
      console.log("[holiday-notifications] Empty description, skipping");
      return new Response(JSON.stringify({ skipped: "empty_description" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all active users (with a profile, not deleted)
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("user_id, first_name")
      .is("deleted_at", null)
      .or("is_deleted.is.null,is_deleted.eq.false");

    if (profErr) throw profErr;
    console.log(`[holiday-notifications] Targeting ${profiles?.length ?? 0} users`);

    const route = `/holiday/${isoDate}`;
    const title = `Sărbătoare: ${holidayName}`;

    let inserted = 0;
    let pushed = 0;

    for (const p of profiles ?? []) {
      const message = buildHolidayMessage(p.first_name, holidayName);

      // De-dupe via "data->>date" check
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", p.user_id)
        .eq("type", "holiday")
        .eq("data->>date", isoDate)
        .limit(1);

      if (existing && existing.length > 0) continue;

      const { error: insErr } = await supabase.from("notifications").insert({
        user_id: p.user_id,
        type: "holiday",
        title,
        message,
        data: {
          date: isoDate,
          description: holiday.description,
          route,
        },
      });
      if (insErr) {
        console.error("[holiday-notifications] insert err:", insErr.message);
        continue;
      }
      inserted++;

      try {
        await supabase.functions.invoke("send-push", {
          body: {
            user_ids: [p.user_id],
            title,
            body: message,
            data: { type: "holiday", route, date: isoDate },
          },
          headers: { "x-send-push-secret": pushSecret },
        });
        pushed++;
      } catch (e) {
        console.error("[holiday-notifications] push err for", p.user_id, e);
      }
    }

    console.log(`[holiday-notifications] Done. inserted=${inserted} pushed=${pushed}`);
    return new Response(
      JSON.stringify({ success: true, holiday: holidayName, inserted, pushed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[holiday-notifications] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
