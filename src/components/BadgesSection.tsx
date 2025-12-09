import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import BadgeIcon from "./BadgeIcon";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { Award } from "lucide-react";

interface Badge {
  id: string;
  name: string;
  name_ro: string;
  description: string;
  icon_name: string;
  priority: number;
}

interface EarnedBadge extends Badge {
  earned_at: string;
}

interface BadgesSectionProps {
  userId: string;
}

const BadgesSection = ({ userId }: BadgesSectionProps) => {
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        // Fetch all available badges
        const { data: badges, error: badgesError } = await supabase
          .from("badges")
          .select("*")
          .order("priority", { ascending: true });

        if (badgesError) throw badgesError;
        setAllBadges(badges || []);

        // Fetch user's earned badges
        const { data: userBadges, error: userBadgesError } = await supabase
          .from("user_badges")
          .select(`
            earned_at,
            badge_id,
            badges (*)
          `)
          .eq("user_id", userId);

        if (userBadgesError) throw userBadgesError;

        const earned = (userBadges || []).map((ub: any) => ({
          ...ub.badges,
          earned_at: ub.earned_at,
        }));
        setEarnedBadges(earned);
      } catch (error) {
        console.error("Error fetching badges:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchBadges();
    }
  }, [userId]);

  if (loading) {
    return (
      <Card className="glow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Award className="w-5 h-5" />
            Insignele Mele
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const isEarned = (badgeId: string) => {
    return earnedBadges.some((eb) => eb.id === badgeId);
  };

  const getEarnedDate = (badgeId: string) => {
    const eb = earnedBadges.find((eb) => eb.id === badgeId);
    return eb?.earned_at;
  };

  return (
    <Card className="glow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Award className="w-5 h-5" />
          Insignele Mele
        </CardTitle>
      </CardHeader>
      <CardContent>
        {earnedBadges.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-4">
            Încă nu ai câștigat nicio insignă. Participă la pelerinaje și contribuie în comunitate pentru a debloca insigne!
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-4">
          {allBadges.map((badge) => {
            const earned = isEarned(badge.id);
            const earnedDate = getEarnedDate(badge.id);

            return (
              <div
                key={badge.id}
                className={`relative rounded-xl border p-4 transition-all ${
                  earned
                    ? "bg-accent/10 border-accent/30"
                    : "bg-muted/50 border-border opacity-50 grayscale"
                }`}
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <div
                    className={`p-3 rounded-full ${
                      earned ? "bg-accent/20" : "bg-muted"
                    }`}
                  >
                    <BadgeIcon
                      iconName={badge.icon_name}
                      size="lg"
                      className={earned ? "text-accent" : "text-muted-foreground"}
                    />
                  </div>
                  <h4 className="font-semibold text-sm leading-tight">
                    {badge.name_ro}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {badge.description}
                  </p>
                  {earned && earnedDate && (
                    <span className="text-xs text-accent font-medium">
                      {format(new Date(earnedDate), "d MMM yyyy", { locale: ro })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default BadgesSection;
