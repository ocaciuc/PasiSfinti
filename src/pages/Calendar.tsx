import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CalendarDay {
  day: number;
  summary_title: string;
  fast_level: number;
  feast_level: number;
  feast_level_description?: string;
}

const Calendar = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });
  }, [navigate]);

  useEffect(() => {
    fetchMonthData();
  }, [currentMonth]);

  const fetchMonthData = async () => {
    setLoading(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;

      const response = await fetch(
        `https://orthocal.info/api/gregorian/${year}/${month}/`
      );

      if (response.ok) {
        const data = await response.json();
        setCalendarData(data.days || []);
      }
    } catch (error) {
      console.error("Error fetching calendar data:", error);
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = calendarData.find(d => d.day === day);
      days.push(dayData);
    }
    
    return days;
  };

  const monthName = currentMonth.toLocaleDateString("ro-RO", {
    month: "long",
    year: "numeric"
  });

  const weekDays = ["Dum", "Lun", "Mar", "Mie", "Joi", "Vin", "Sâm"];

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
        {/* Month Navigation */}
        <Card className="glow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPreviousMonth}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <CardTitle className="text-primary capitalize">
                {monthName}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNextMonth}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : (
              <>
                {/* Week day headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="text-center text-xs font-medium text-muted-foreground p-2"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar days */}
                <div className="grid grid-cols-7 gap-1">
                  {getDaysInMonth().map((dayData, index) => {
                    if (!dayData) {
                      return <div key={`empty-${index}`} className="p-2" />;
                    }

                    const isMajorFeast = dayData.feast_level >= 6;
                    const today = new Date();
                    const isToday =
                      dayData.day === today.getDate() &&
                      currentMonth.getMonth() === today.getMonth() &&
                      currentMonth.getFullYear() === today.getFullYear();

                    return (
                      <button
                        key={dayData.day}
                        onClick={() => setSelectedDay(dayData)}
                        className={`
                          relative p-2 text-center rounded-md transition-colors
                          ${isToday ? "bg-primary text-primary-foreground font-bold" : "hover:bg-accent/10"}
                          ${selectedDay?.day === dayData.day ? "ring-2 ring-accent" : ""}
                        `}
                      >
                        <div className="text-sm">{dayData.day}</div>
                        {isMajorFeast && (
                          <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-accent rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Selected Day Details */}
        {selectedDay && (
          <Card className="glow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <CalendarIcon className="w-5 h-5" />
                {selectedDay.day} {monthName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h3 className="font-medium mb-1">Sărbătoare</h3>
                <p className="text-sm">{selectedDay.summary_title}</p>
              </div>

              {selectedDay.feast_level_description && (
                <div>
                  <h3 className="font-medium mb-1 text-accent">Importanță</h3>
                  <p className="text-sm">{selectedDay.feast_level_description}</p>
                </div>
              )}

              <div>
                <h3 className="font-medium mb-1">Post</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedDay.fast_level === 0 && "Zi fără post"}
                  {selectedDay.fast_level === 1 && "Post ușor"}
                  {selectedDay.fast_level === 2 && "Post normal"}
                  {selectedDay.fast_level === 3 && "Post strict"}
                  {selectedDay.fast_level === 4 && "Post aspru"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Navigation />
    </div>
  );
};

export default Calendar;
