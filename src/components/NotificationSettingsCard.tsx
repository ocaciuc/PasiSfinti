import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Bell, MessageCircle, Flame, Calendar, Sparkles, Moon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NotificationPreferences {
  comment_replies: boolean;
  candle_activity: boolean;
  pilgrimage_reminders: boolean;
  holiday_notifications: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string; // "HH:MM"
  quiet_hours_end: string;   // "HH:MM"
}

interface NotificationSettingsCardProps {
  userId: string;
}

const trimSeconds = (t: string) => (t?.length >= 5 ? t.slice(0, 5) : t);

const NotificationSettingsCard = ({ userId }: NotificationSettingsCardProps) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    comment_replies: true,
    candle_activity: true,
    pilgrimage_reminders: true,
    holiday_notifications: true,
    quiet_hours_enabled: false,
    quiet_hours_start: "22:00",
    quiet_hours_end: "08:00",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const fetchPreferences = async () => {
      const { data, error } = await supabase
        .from("notification_settings")
        .select(
          "comment_replies, candle_activity, pilgrimage_reminders, holiday_notifications, quiet_hours_enabled, quiet_hours_start, quiet_hours_end"
        )
        .eq("user_id", userId)
        .single();

      if (error && error.code === "PGRST116") {
        await supabase.from("notification_settings").insert({ user_id: userId });
      } else if (data) {
        const d = data as any;
        setPreferences({
          comment_replies: d.comment_replies ?? true,
          candle_activity: d.candle_activity ?? true,
          pilgrimage_reminders: d.pilgrimage_reminders ?? true,
          holiday_notifications: d.holiday_notifications ?? true,
          quiet_hours_enabled: d.quiet_hours_enabled ?? false,
          quiet_hours_start: trimSeconds(d.quiet_hours_start ?? "22:00"),
          quiet_hours_end: trimSeconds(d.quiet_hours_end ?? "08:00"),
        });
      }
      setLoading(false);
    };

    fetchPreferences();
  }, [userId]);

  const persist = async (patch: Partial<NotificationPreferences>, key: string) => {
    setSaving(key);
    const { error } = await supabase
      .from("notification_settings")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    setSaving(null);
    if (error) {
      toast.error("Eroare la salvarea preferințelor");
      return false;
    }
    return true;
  };

  const handleToggle = async (
    key: keyof NotificationPreferences,
    value: boolean
  ) => {
    const prev = preferences[key];
    setPreferences((p) => ({ ...p, [key]: value }));
    const ok = await persist({ [key]: value } as any, key);
    if (!ok) setPreferences((p) => ({ ...p, [key]: prev as any }));
  };

  const handleTimeChange = async (
    key: "quiet_hours_start" | "quiet_hours_end",
    value: string
  ) => {
    const prev = preferences[key];
    setPreferences((p) => ({ ...p, [key]: value }));
    const ok = await persist({ [key]: value } as any, key);
    if (!ok) setPreferences((p) => ({ ...p, [key]: prev }));
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
      description:
        "Primești notificări când cineva răspunde la comentariul tău într-o discuție de pelerinaj.",
    },
    {
      key: "candle_activity" as const,
      icon: Flame,
      label: "Activitate Lumânări",
      description:
        "Primești notificări când o lumânare aprinsă de tine urmează să se stingă.",
    },
    {
      key: "pilgrimage_reminders" as const,
      icon: Calendar,
      label: "Calendar Pelerinaje",
      description:
        "Primești o notificare cu 3 zile înainte de începerea unui pelerinaj la care te-ai înscris.",
    },
    {
      key: "holiday_notifications" as const,
      icon: Sparkles,
      label: "Sărbători Ortodoxe",
      description:
        "Primești o notificare în zilele marilor sărbători cu numele sfintei zile.",
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
                checked={preferences[toggle.key] as boolean}
                onCheckedChange={(val) => handleToggle(toggle.key, val)}
                disabled={saving === toggle.key}
              />
            </div>
          );
        })}

        {/* Quiet hours */}
        <div className="pt-4 border-t border-border space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Moon className="w-5 h-5 text-accent mt-0.5 shrink-0" />
              <div className="space-y-1">
                <Label htmlFor="quiet_hours_enabled" className="text-sm font-medium cursor-pointer">
                  Fereastră de liniște
                </Label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  În acest interval nu primești nicio notificare push.
                </p>
              </div>
            </div>
            <Switch
              id="quiet_hours_enabled"
              checked={preferences.quiet_hours_enabled}
              onCheckedChange={(val) => handleToggle("quiet_hours_enabled", val)}
              disabled={saving === "quiet_hours_enabled"}
            />
          </div>

          {preferences.quiet_hours_enabled && (
            <div className="grid grid-cols-2 gap-3 pl-8">
              <div className="space-y-1.5">
                <Label htmlFor="quiet_start" className="text-xs text-muted-foreground">
                  De la
                </Label>
                <Input
                  id="quiet_start"
                  type="time"
                  value={preferences.quiet_hours_start}
                  onChange={(e) => handleTimeChange("quiet_hours_start", e.target.value)}
                  disabled={saving === "quiet_hours_start"}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quiet_end" className="text-xs text-muted-foreground">
                  Până la
                </Label>
                <Input
                  id="quiet_end"
                  type="time"
                  value={preferences.quiet_hours_end}
                  onChange={(e) => handleTimeChange("quiet_hours_end", e.target.value)}
                  disabled={saving === "quiet_hours_end"}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationSettingsCard;
