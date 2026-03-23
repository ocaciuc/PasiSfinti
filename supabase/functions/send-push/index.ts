import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Get an OAuth2 access token for FCM V1 API using service account credentials.
 */
async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj: any) => {
    const json = new TextEncoder().encode(JSON.stringify(obj));
    return btoa(String.fromCharCode(...json))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  };

  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${unsignedToken}.${signatureB64}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error("Failed to get access token: " + JSON.stringify(tokenData));
  }
  console.log("[send-push] ✅ FCM access token obtained");
  return tokenData.access_token;
}

/**
 * Send a push notification to a specific FCM token using FCM V1 API.
 */
async function sendFcmMessage(
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  const message: any = {
    message: {
      token,
      notification: { title, body },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channel_id: "pelerin_notifications",
        },
      },
    },
  };

  if (data) {
    message.message.data = data;
  }

  console.log(`[send-push] Sending to token ${token.substring(0, 15)}... title="${title}"`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[send-push] ❌ FCM failed for token ${token.substring(0, 15)}...:`, err);
    return false;
  }

  const result = await res.json();
  console.log(`[send-push] ✅ FCM success for token ${token.substring(0, 15)}...:`, JSON.stringify(result));
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sendPushSecret = Deno.env.get("SEND_PUSH_SECRET");
    const fcmKeyJson = Deno.env.get("FCM_SERVICE_ACCOUNT_KEY");

    // Authenticate: require shared secret header
    const authSecret = req.headers.get("x-send-push-secret");
    if (!sendPushSecret || authSecret !== sendPushSecret) {
      console.error("[send-push] ❌ Unauthorized: invalid or missing x-send-push-secret header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!fcmKeyJson) {
      console.error("[send-push] ❌ FCM_SERVICE_ACCOUNT_KEY secret is not set!");
      return new Response(
        JSON.stringify({ error: "FCM_SERVICE_ACCOUNT_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceAccount = JSON.parse(fcmKeyJson);
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { user_ids, title, body, data } = await req.json();
    console.log(`[send-push] Request: user_ids=${JSON.stringify(user_ids)}, title="${title}"`);

    if (!user_ids || !title || !body) {
      return new Response(
        JSON.stringify({ error: "Missing user_ids, title, or body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get FCM tokens for the target users
    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("token, user_id")
      .in("user_id", user_ids);

    if (tokensError) {
      console.error("[send-push] ❌ Token fetch error:", tokensError.message);
      throw new Error("Error fetching tokens: " + tokensError.message);
    }

    console.log(`[send-push] Found ${tokens?.length ?? 0} token(s) for ${user_ids.length} user(s)`);

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No push tokens found for users" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get access token for FCM
    const accessToken = await getAccessToken(serviceAccount);
    const projectId = serviceAccount.project_id;

    let sent = 0;
    let failed = 0;

    for (const tokenRecord of tokens) {
      const success = await sendFcmMessage(
        accessToken,
        projectId,
        tokenRecord.token,
        title,
        body,
        data
      );
      if (success) {
        sent++;
      } else {
        failed++;
        // Remove invalid tokens
        console.log(`[send-push] Removing invalid token for user ${tokenRecord.user_id}`);
        await supabase
          .from("push_tokens")
          .delete()
          .eq("token", tokenRecord.token);
      }
    }

    console.log(`[send-push] Done: sent=${sent}, failed=${failed}`);

    return new Response(
      JSON.stringify({ success: true, sent, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[send-push] ❌ Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
