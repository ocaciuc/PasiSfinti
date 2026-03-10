import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, MessageCircle, Flame, Calendar, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NotificationPreferences {
  comment_replies: boolean;
  candle_activity: boolean;
  pilgrimage_reminders: boolean;
}

interface NotificationSettingsCardProps {
  userId: string;
}

const NotificationSettingsCard = ({ userId }: NotificationSettingsCardProps) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    comment_replies: true,
    candle_activity: true,
    pilgrimage_reminders: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const fetchPreferences = async () => {
      const { data, error } = await supabase
        .from("notification_settings")
        .select("comment_replies, candle_activity, pilgrimage_reminders")
        .eq("user_id", userId)
        .single();

      if (error && error.code === "PGRST116") {
        // No row exists, create default settings
        await supabase.from("notification_settings").insert({ user_id: userId });
      } else if (data) {
        setPreferences({
          comment_replies: data.comment_replies ?? true,
          candle_activity: (data as any).candle_activity ?? true,
          pilgrimage_reminders: data.pilgrimage_reminders ?? true,
        });
      }
      setLoading(false);
    };

    fetchPreferences();
  }, [userId]);

  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    setSaving(key);
    const prev = preferences[key];
    setPreferences((p) => ({ ...p, [key]: value }));

    const { error } = await supabase
      .from("notification_settings")
      .update({ [key]: value, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (error) {
      setPreferences((p) => ({ ...p, [key]: prev }));
      toast.error("Eroare la salvarea preferințelor");
    }
    setSaving(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const toggles = [
    {
      key: "comment_replies" as const,
      icon: MessageCircle,
      label: "Mesaje Pelerinaj",
      description: "Primești notificări când cineva răspunde la comentariul tău într-o discuție de pelerinaj.",
    },
    {
      key: "candle_activity" as const,
      icon: Flame,
      label: "Activitate Lumânări",
      description: "Primești notificări când o lumânare aprinsă de tine urmează să se stingă.",
    },
    {
      key: "pilgrimage_reminders" as const,
      icon: Calendar,
      label: "Calendar Pelerinaje",
      description: "Primești o notificare cu 3 zile înainte de începerea unui pelerinaj la care te-ai înscris.",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="w-5 h-5" />
          Notificări
        </CardTitle>
        <CardDescription>
          Alege ce tipuri de notificări dorești să primești.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {toggles.map((toggle) => {
          const Icon = toggle.icon;
          return (
            <div key={toggle.key} className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <Icon className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <Label htmlFor={toggle.key} className="text-sm font-medium cursor-pointer">
                    {toggle.label}
                  </Label>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {toggle.description}
                  </p>
                </div>
              </div>
              <Switch
                id={toggle.key}
                checked={preferences[toggle.key]}
                onCheckedChange={(val) => handleToggle(toggle.key, val)}
                disabled={saving === toggle.key}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default NotificationSettingsCard;
