import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

// Dynamically import to avoid Rollup resolution errors on web builds
const getPushNotifications = async () => {
  const mod = await import("@capacitor/push-notifications");
  return mod.PushNotifications;
};

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
    console.log("Push notifications only available on native platforms");
    return;
  }

  try {
    const PushNotifications = await getPushNotifications();

    // Check current permission status
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === "prompt") {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== "granted") {
      console.log("Push notification permission not granted");
      return;
    }

    // Register for push notifications
    await PushNotifications.register();

    // Listen for registration success
    PushNotifications.addListener("registration", async (token) => {
      console.log("FCM Token received:", token.value);
      await storePushToken(userId, token.value);
    });

    // Listen for registration errors
    PushNotifications.addListener("registrationError", (err) => {
      console.error("Push registration error:", err.error);
    });

    // Listen for push notifications received while app is in foreground
    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("Push notification received:", notification);
    });

    // Listen for push notification action (user tapped the notification)
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      console.log("Push notification action:", action);
      const data = action.notification.data;
      if (data?.route && onNavigate) {
        console.log("[Push] Navigating to:", data.route);
        onNavigate(data.route);
      }
    });
  } catch (error) {
    console.error("Error initializing push notifications:", error);
  }
};

/**
 * Store or update the FCM token in the push_tokens table.
 */
const storePushToken = async (userId: string, token: string) => {
  try {
    const { error } = await supabase
      .from("push_tokens" as any)
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
      console.error("Error storing push token:", error);
    } else {
      console.log("Push token stored successfully");
    }
  } catch (err) {
    console.error("Error in storePushToken:", err);
  }
};

/**
 * Remove push token on logout.
 */
export const removePushToken = async (userId: string) => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await supabase
      .from("push_tokens" as any)
      .delete()
      .eq("user_id", userId);
  } catch (err) {
    console.error("Error removing push token:", err);
  }
};
