import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Flame, Map, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";

interface OrthodoxCalendarData {
  summary_title: string;
  fast_level_desc: string;
  feast_level_description?: string;
}

interface Candle {
  expires_at: string;
  purpose: string | null;
}

interface NextPilgrimage {
  id: string;
  title: string;
  start_date: string;
  location: string;
  participant_count: number;
}

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCandle, setActiveCandle] = useState<Candle | null>(null);
  const [orthodoxCalendar, setOrthodoxCalendar] = useState<OrthodoxCalendarData | null>(null);
  const [nextPilgrimage, setNextPilgrimage] = useState<NextPilgrimage | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate("/auth");
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
        setLoading(false);
        return;
      }

      // Check if user has a profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (profileError || !profile) {
        // No profile found, redirect to onboarding
        navigate("/onboarding");
        setLoading(false);
        return;
      }

      // Fetch dashboard data
      await Promise.all([
        checkActiveCandleStatus(session.user.id),
        fetchOrthodoxCalendar(),
        fetchNextPilgrimage(session.user.id)
      ]);
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkActiveCandleStatus = async (userId: string) => {
    const { data } = await supabase
      .from("candle_purchases")
      .select("expires_at, purpose")
      .eq("user_id", userId)
      .gte("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setActiveCandle(data);
  };

  const fetchOrthodoxCalendar = async () => {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      const day = today.getDate();
      
      const response = await fetch(
        `https://orthocal.info/api/gregorian/${year}/${month}/${day}/`
      );
      
      if (response.ok) {
        const data = await response.json();
        setOrthodoxCalendar(data);
      }
    } catch (error) {
      console.error("Error fetching Orthodox calendar:", error);
    }
  };

  const fetchNextPilgrimage = async (userId: string) => {
    try {
      // First, get pilgrimages the user has joined
      const { data: userPilgrimages } = await supabase
        .from("user_pilgrimages")
        .select("pilgrimage_id")
        .eq("user_id", userId);

      if (userPilgrimages && userPilgrimages.length > 0) {
        // Get the next upcoming pilgrimage the user has joined
        const { data: joinedPilgrimage } = await supabase
          .from("pilgrimages")
          .select("id, title, start_date, location, participant_count")
          .in("id", userPilgrimages.map(up => up.pilgrimage_id))
          .gte("start_date", new Date().toISOString())
          .order("start_date", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (joinedPilgrimage) {
          setNextPilgrimage(joinedPilgrimage);
          return;
        }
      }

      // If user hasn't joined any, get the next major pilgrimage
      const { data: majorPilgrimage } = await supabase
        .from("pilgrimages")
        .select("id, title, start_date, location, participant_count")
        .eq("type", "national")
        .gte("start_date", new Date().toISOString())
        .order("start_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      setNextPilgrimage(majorPilgrimage);
    } catch (error) {
      console.error("Error fetching next pilgrimage:", error);
    }
  };

  // Update candle timer every minute
  useEffect(() => {
    if (!activeCandle) return;

    const updateTimer = () => {
      const remaining = formatDistanceToNow(new Date(activeCandle.expires_at), {
        locale: ro,
        addSuffix: true
      });
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [activeCandle]);

  if (loading || !user) return null;

  const today = new Date().toLocaleDateString("ro-RO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-6 glow-soft">
        <h1 className="text-2xl font-bold text-center mb-1">Pași de Pelerin</h1>
        <p className="text-center text-sm opacity-90">Bun venit pe drumul tău spiritual</p>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Orthodox Calendar */}
        <Card 
          className="glow-soft cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate("/calendar")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Calendar className="w-5 h-5" />
              Calendar Ortodox
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">{today}</p>
            {orthodoxCalendar ? (
              <>
                <p className="font-medium">{orthodoxCalendar.summary_title}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {orthodoxCalendar.fast_level_desc}
                </p>
                {orthodoxCalendar.feast_level_description && (
                  <p className="text-xs text-accent mt-1">
                    {orthodoxCalendar.feast_level_description}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Se încarcă...</p>
            )}
          </CardContent>
        </Card>

        {/* Virtual Candle or Next Pilgrimage */}
        {activeCandle ? (
          <Card className="glow-candle bg-gradient-to-br from-accent/10 to-background">
            <CardContent className="pt-6 text-center">
              <Flame className="w-12 h-12 text-accent mx-auto mb-3 animate-flicker" />
              <p className="font-medium text-accent mb-1">Lumânarea ta arde</p>
              {activeCandle.purpose && (
                <p className="text-sm text-muted-foreground mb-2 italic">
                  "{activeCandle.purpose}"
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Se stinge {timeRemaining}
              </p>
            </CardContent>
          </Card>
        ) : nextPilgrimage ? (
          <Card className="glow-soft">
            <CardHeader>
              <CardTitle className="text-primary">
                {nextPilgrimage.participant_count && nextPilgrimage.participant_count > 0 
                  ? "Următorul tău pelerinaj"
                  : "Următorul Pelerinaj Mare"
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium mb-2">{nextPilgrimage.title}</p>
              <p className="text-sm text-muted-foreground mb-3">
                {new Date(nextPilgrimage.start_date).toLocaleDateString("ro-RO", {
                  day: "numeric",
                  month: "long",
                  year: "numeric"
                })} • {nextPilgrimage.location}
              </p>
              {nextPilgrimage.participant_count > 0 && (
                <p className="text-xs text-muted-foreground mb-3">
                  {nextPilgrimage.participant_count} pelerini înregistrați
                </p>
              )}
              <Button 
                onClick={() => navigate(`/pilgrimage/${nextPilgrimage.id}`)}
                className="w-full"
              >
                Vezi detalii
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="glow-soft">
            <CardHeader>
              <CardTitle className="text-primary">Pelerinaje</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Descoperă următorul tău pelerinaj spiritual
              </p>
              <Button 
                onClick={() => navigate("/pilgrimages")}
                className="w-full"
              >
                Explorează pelerinaje
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Card 
            className="cursor-pointer hover:glow-soft transition-all"
            onClick={() => navigate("/pilgrimages")}
          >
            <CardContent className="pt-6 text-center">
              <Map className="w-8 h-8 text-accent mx-auto mb-2" />
              <p className="font-medium text-sm">Pelerinaje</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:glow-soft transition-all"
            onClick={() => navigate("/candle")}
          >
            <CardContent className="pt-6 text-center">
              <Flame className="w-8 h-8 text-accent mx-auto mb-2" />
              <p className="font-medium text-sm">Aprinde Lumânare</p>
            </CardContent>
          </Card>
        </div>

      </div>

      <Navigation />
    </div>
  );
};

export default Index;
