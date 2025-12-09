import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CalendarDay {
  day_number: number;
  description: string;
  color: string;
}

interface TodayCalendarCardProps {
  onClick?: () => void;
  showHeader?: boolean;
}

export const TodayCalendarCard = ({ onClick, showHeader = true }: TodayCalendarCardProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [todayData, setTodayData] = useState<CalendarDay | null>(null);

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
        .select("*")
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
    day: "numeric"
  });

  return (
    <Card className="glow-soft">
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
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{formattedDate}</p>
            <div className="flex items-start gap-3">
              <CalendarIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                todayData.color === 'red' ? 'text-red-600' : 'text-foreground'
              }`} />
              <p className={`text-sm leading-relaxed ${
                todayData.color === 'red' ? 'text-red-600 font-medium' : 'text-foreground'
              }`}>
                {todayData.description}
              </p>
            </div>
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
