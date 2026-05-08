import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Calendar as CalendarIcon, BookOpen, UtensilsCrossed } from "lucide-react";

interface HolidayDay {
  description: string;
  color: string;
  comments: string | null;
  post: string | null;
}

const formatDateRo = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("ro-RO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const HolidayDetail = () => {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [holiday, setHoliday] = useState<HolidayDay | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth");
    });
  }, [navigate]);

  useEffect(() => {
    const load = async () => {
      if (!date) return;
      setLoading(true);
      const [yStr, mStr, dStr] = date.split("-");
      const year = Number(yStr);
      const month = Number(mStr);
      const day = Number(dStr);
      if (!year || !month || !day) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("orthodox_calendar_days")
        .select("description, color, comments, post")
        .eq("year", year)
        .eq("month", month)
        .eq("day_number", day)
        .maybeSingle();
      setHoliday(data);
      setLoading(false);
    };
    load();
  }, [date]);

  return (
    <div className="min-h-screen bg-background pb-safe">
      <header className="bg-primary text-primary-foreground p-6 glow-soft">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="text-primary-foreground hover:bg-primary-foreground/10"
            aria-label="Înapoi"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Sărbătoare</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        <Card className="glow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <CalendarIcon className="w-5 h-5" />
              {date ? formatDateRo(date) : "Sărbătoare"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ) : holiday ? (
              <>
                <p
                  className={`text-base leading-relaxed whitespace-pre-line ${
                    holiday.color === "red" ? "text-red-600 font-medium" : "text-foreground"
                  }`}
                >
                  {holiday.description}
                </p>

                {holiday.comments && (
                  <div className="flex items-start gap-3 pt-3 border-t border-border">
                    <BookOpen className="w-4 h-4 flex-shrink-0 mt-1 text-primary" />
                    <div>
                      <p className="text-xs font-medium text-primary mb-1">Despre sfântul zilei</p>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {holiday.comments}
                      </p>
                    </div>
                  </div>
                )}

                {holiday.post && (
                  <div className="flex items-start gap-3 pt-3 border-t border-border">
                    <UtensilsCrossed className="w-4 h-4 flex-shrink-0 mt-1 text-accent" />
                    <div>
                      <p className="text-xs font-medium text-accent mb-1">Post</p>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {holiday.post}
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nu există informații pentru această zi.
              </p>
            )}
          </CardContent>
        </Card>
      </main>

      <Navigation />
    </div>
  );
};

export default HolidayDetail;
