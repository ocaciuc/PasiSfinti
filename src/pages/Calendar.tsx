import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { TodayCalendarCard } from "@/components/TodayCalendarCard";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

const Calendar = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-6 glow-soft">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
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
        <TodayCalendarCard showHeader={false} />
      </div>

      <Navigation />
    </div>
  );
};

export default Calendar;
