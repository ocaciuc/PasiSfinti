import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Bell, MessageCircle, Flame, Calendar, CheckCheck } from "lucide-react";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";
import Navigation from "@/components/Navigation";

const notificationIcon: Record<string, typeof Bell> = {
  comment_reply: MessageCircle,
  candle_expiry: Flame,
  pilgrimage_reminder: Calendar,
};

const getNavigationPath = (notification: Notification): string | null => {
  const data = notification.data as Record<string, any> | null;
  if (!data) return null;

  switch (notification.type) {
    case "comment_reply":
      return data.post_id ? `/pilgrimage/${data.pilgrimage_id || ""}` : null;
    case "candle_expiry":
      return "/candle";
    case "pilgrimage_reminder":
      return data.pilgrimage_id ? `/pilgrimage/${data.pilgrimage_id}` : null;
    default:
      return null;
  }
};

const Notifications = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUserId(user.id);
    });
  }, [navigate]);

  const { notifications, loading, markAsRead, markAllAsRead, unreadCount } = useNotifications(userId);

  const handleTap = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    const path = getNavigationPath(notification);
    if (path) navigate(path);
  };

  return (
    <div className="min-h-screen bg-background pb-safe">
      <div className="bg-primary text-primary-foreground p-4 pb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold">Notificări</h1>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-primary-foreground hover:bg-primary-foreground/10 text-xs"
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Marchează toate
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">Nu ai notificări deocamdată.</p>
          </div>
        ) : (
          notifications.map((notification) => {
            const Icon = notificationIcon[notification.type] || Bell;
            return (
              <Card
                key={notification.id}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  !notification.read ? "border-accent/50 bg-accent/5" : ""
                }`}
                onClick={() => handleTap(notification)}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={`p-2 rounded-full shrink-0 ${
                    !notification.read ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!notification.read ? "font-semibold" : "font-medium"}`}>
                      {notification.title}
                    </p>
                    {notification.message && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ro })}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 rounded-full bg-accent shrink-0 mt-2" />
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Navigation />
    </div>
  );
};

export default Notifications;
