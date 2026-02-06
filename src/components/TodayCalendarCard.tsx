import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, ChevronDown, BookOpen, UtensilsCrossed } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

interface CalendarDay {
  day_number: number;
  description: string;
  color: string;
  comments: string | null;
  post: string | null;
}

interface TodayCalendarCardProps {
  onClick?: () => void;
  showHeader?: boolean;
}

export const TodayCalendarCard = ({ onClick, showHeader = true }: TodayCalendarCardProps) => {
  const [loading, setLoading] = useState(true);
  const [todayData, setTodayData] = useState<CalendarDay | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchTodayData();
  }, []);

  const fetchTodayData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      const day = today.getDate();

      const { data, error } = await supabase
        .from("orthodox_calendar_days")
        .select("day_number, description, color, comments, post")
        .eq("year", year)
        .eq("month", month)
        .eq("day_number", day)
        .maybeSingle();

      if (error) {
        console.error("Error fetching calendar data:", error);
      } else {
        setTodayData(data);
      }
    } catch (error) {
      console.error("Error fetching calendar data:", error);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();
  const formattedDate = today.toLocaleDateString("ro-RO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const hasExpandableContent = todayData?.comments || todayData?.post;

  const handleToggle = () => {
    if (hasExpandableContent) {
      setExpanded((prev) => !prev);
    }
  };

  return (
    <Card className="glow-soft overflow-hidden">
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <CalendarIcon className="w-5 h-5" />
            Calendar Ortodox
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={showHeader ? "" : "pt-6"}>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : todayData ? (
          <div>
            {/* Tappable main area */}
            <div
              className={`space-y-2 ${hasExpandableContent ? "cursor-pointer active:opacity-80" : ""}`}
              onClick={handleToggle}
              role={hasExpandableContent ? "button" : undefined}
              tabIndex={hasExpandableContent ? 0 : undefined}
              onKeyDown={(e) => {
                if (hasExpandableContent && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  handleToggle();
                }
              }}
            >
              <p className="text-sm text-muted-foreground">{formattedDate}</p>
              <div className="flex items-start gap-3">
                <CalendarIcon
                  className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    todayData.color === "red" ? "text-red-600" : "text-foreground"
                  }`}
                />
                <p
                  className={`text-sm leading-relaxed flex-1 ${
                    todayData.color === "red" ? "text-red-600 font-medium" : "text-foreground"
                  }`}
                >
                  {todayData.description}
                </p>
                {hasExpandableContent && (
                  <motion.div
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="flex-shrink-0 mt-0.5"
                  >
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </motion.div>
                )}
              </div>
            </div>

            {/* Expandable details */}
            <AnimatePresence initial={false}>
              {expanded && hasExpandableContent && (
                <motion.div
                  key="calendar-details"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-4 border-t border-border space-y-4">
                    {/* Saint details / Comments */}
                    {todayData.comments && (
                      <div className="flex items-start gap-3">
                        <BookOpen className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary" />
                        <div>
                          <p className="text-xs font-medium text-primary mb-1">Despre sfântul zilei</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {todayData.comments}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Fasting info / Post */}
                    {todayData.post && (
                      <div className="flex items-start gap-3">
                        <UtensilsCrossed className="w-4 h-4 flex-shrink-0 mt-0.5 text-accent" />
                        <div>
                          <p className="text-xs font-medium text-accent mb-1">Post</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {todayData.post}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">Nu există date disponibile pentru ziua de azi</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
