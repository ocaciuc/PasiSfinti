import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

// Dynamically import to avoid Rollup resolution errors on web builds
const getPushNotifications = async () => {
  const mod = await import("@capacitor/push-notifications");
  return mod.PushNotifications;
};

// Track whether listeners have already been attached
let listenersRegistered = false;

/**
 * Initialize push notifications on native platforms.
 * Requests permission, registers for push, and stores the FCM token.
 * @param onNavigate - callback to handle navigation when user taps a notification
 */
export const initPushNotifications = async (
  userId: string,
  onNavigate?: (path: string) => void
) => {
  if (!Capacitor.isNativePlatform()) {
    console.log("[Push] Skipped — not a native platform");
    return;
  }

  console.log("[Push] Initializing for user:", userId);

  try {
    const PushNotifications = await getPushNotifications();

    // Check current permission status
    let permStatus = await PushNotifications.checkPermissions();
    console.log("[Push] Current permission status:", permStatus.receive);

    if (permStatus.receive === "prompt") {
      console.log("[Push] Requesting permissions...");
      permStatus = await PushNotifications.requestPermissions();
      console.log("[Push] Permission result:", permStatus.receive);
    }

    if (permStatus.receive !== "granted") {
      console.warn("[Push] Permission NOT granted:", permStatus.receive);
      return;
    }

    // Only attach listeners once to avoid duplicates
    if (!listenersRegistered) {
      console.log("[Push] Attaching listeners (first time)");

      // Listen for registration success
      PushNotifications.addListener("registration", async (token) => {
        console.log("[Push] ✅ FCM Token received:", token.value.substring(0, 20) + "...");
        await storePushToken(userId, token.value);
      });

      // Listen for registration errors
      PushNotifications.addListener("registrationError", (err) => {
        console.error("[Push] ❌ Registration error:", JSON.stringify(err));
      });

      // Listen for push notifications received while app is in foreground
      PushNotifications.addListener("pushNotificationReceived", (notification) => {
        console.log("[Push] 📩 Notification received in foreground:", JSON.stringify(notification));
      });

      // Listen for push notification action (user tapped the notification)
      PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        console.log("[Push] 👆 Notification tapped:", JSON.stringify(action));
        const data = action.notification.data;
        if (data?.route && onNavigate) {
          console.log("[Push] Navigating to:", data.route);
          onNavigate(data.route);
        }
      });

      listenersRegistered = true;
    } else {
      console.log("[Push] Listeners already registered, skipping");
    }

    // Register for push notifications (triggers "registration" event)
    console.log("[Push] Calling register()...");
    await PushNotifications.register();
    console.log("[Push] register() completed");
  } catch (error) {
    console.error("[Push] ❌ Init error:", error);
  }
};

/**
 * Store or update the FCM token in the push_tokens table.
 */
const storePushToken = async (userId: string, token: string) => {
  console.log("[Push] Storing token for user:", userId);
  try {
    const { data, error } = await supabase
      .from("push_tokens")
      .upsert(
        {
          user_id: userId,
          token,
          platform: Capacitor.getPlatform(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,token" }
      );

    if (error) {
      console.error("[Push] ❌ Token store error:", JSON.stringify(error));
    } else {
      console.log("[Push] ✅ Token stored successfully");
    }
  } catch (err) {
    console.error("[Push] ❌ storePushToken exception:", err);
  }
};

/**
 * Remove push token on logout.
 */
export const removePushToken = async (userId: string) => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    console.log("[Push] Removing tokens for user:", userId);
    await supabase
      .from("push_tokens")
      .delete()
      .eq("user_id", userId);
    console.log("[Push] ✅ Tokens removed");
  } catch (err) {
    console.error("[Push] ❌ Remove token error:", err);
  }
};
