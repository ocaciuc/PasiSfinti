import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export const useBadges = (userId: string | null) => {
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [topBadge, setTopBadge] = useState<Badge | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserBadges = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const { data: userBadges, error } = await supabase
          .from("user_badges")
          .select(`
            earned_at,
            badge_id,
            badges (*)
          `)
          .eq("user_id", userId);

        if (error) throw error;

        const earned = (userBadges || []).map((ub: any) => ({
          ...ub.badges,
          earned_at: ub.earned_at,
        }));

        // Sort by priority (highest priority = lowest number)
        earned.sort((a: EarnedBadge, b: EarnedBadge) => a.priority - b.priority);

        setEarnedBadges(earned);
        setTopBadge(earned.length > 0 ? earned[0] : null);
      } catch (error) {
        console.error("Error fetching user badges:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserBadges();
  }, [userId]);

  const evaluateBadges = async () => {
    if (!userId) return;

    try {
      await supabase.rpc("evaluate_and_award_badges", { target_user_id: userId });
      
      // Refetch badges after evaluation
      const { data: userBadges } = await supabase
        .from("user_badges")
        .select(`
          earned_at,
          badge_id,
          badges (*)
        `)
        .eq("user_id", userId);

      const earned = (userBadges || []).map((ub: any) => ({
        ...ub.badges,
        earned_at: ub.earned_at,
      }));

      earned.sort((a: EarnedBadge, b: EarnedBadge) => a.priority - b.priority);
      setEarnedBadges(earned);
      setTopBadge(earned.length > 0 ? earned[0] : null);
    } catch (error) {
      console.error("Error evaluating badges:", error);
    }
  };

  return {
    earnedBadges,
    topBadge,
    loading,
    evaluateBadges,
  };
};

export default useBadges;
