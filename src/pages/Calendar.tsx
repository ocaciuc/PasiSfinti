import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Calendar as CalendarIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CalendarDay {
  day_number: number;
  description: string;
  color: string;
}

const Calendar = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [todayData, setTodayData] = useState<CalendarDay | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });
  }, [navigate]);

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
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-6 glow-soft">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Calendar Ortodox</h1>
          <div className="w-10" /> {/* Spacer for alignment */}
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Today's Calendar Info */}
        <Card className="glow-soft">
          <CardContent className="pt-6">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : todayData ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CalendarIcon className={`w-6 h-6 flex-shrink-0 mt-1 ${
                    todayData.color === 'red' ? 'text-red-600' : 'text-foreground'
                  }`} />
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold capitalize mb-2">
                      {formattedDate}
                    </h2>
                    <p className={`text-sm leading-relaxed ${
                      todayData.color === 'red' ? 'text-red-600 font-medium' : 'text-foreground'
                    }`}>
                      {todayData.description}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nu există date disponibile pentru ziua de azi</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Navigation />
    </div>
  );
};

export default Calendar;
