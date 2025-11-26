import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Flame, Map, Users } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCandleLit, setHasCandleLit] = useState(false);

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

      // Check if user has active candle
      checkActiveCandleStatus(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkActiveCandleStatus = async (userId: string) => {
    const { data } = await supabase
      .from("candle_purchases")
      .select("expires_at")
      .eq("user_id", userId)
      .gte("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false })
      .limit(1)
      .single();

    setHasCandleLit(!!data);
  };

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
        <Card className="glow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Calendar className="w-5 h-5" />
              Calendar Ortodox
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">{today}</p>
            <p className="font-medium">Sfântul Andrei, Apostolul României</p>
            <p className="text-sm text-muted-foreground mt-2">Miercuri, zi de post</p>
          </CardContent>
        </Card>

        {/* Virtual Candle or News */}
        {hasCandleLit ? (
          <Card className="glow-candle bg-gradient-to-br from-accent/10 to-background">
            <CardContent className="pt-6 text-center">
              <Flame className="w-12 h-12 text-accent mx-auto mb-3 animate-flicker" />
              <p className="font-medium text-accent mb-1">Lumânarea ta arde</p>
              <p className="text-sm text-muted-foreground">
                Rugăciunea ta luminează calea
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="glow-soft">
            <CardHeader>
              <CardTitle className="text-primary">Următorul Pelerinaj Mare</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium mb-2">Bobotează 2025 - Mănăstirea Putna</p>
              <p className="text-sm text-muted-foreground mb-3">
                6 Ianuarie 2025 • 2.400 pelerini înregistrați
              </p>
              <Button 
                onClick={() => navigate("/pilgrimages")}
                className="w-full"
              >
                Înscrie-te acum
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

        {/* Community Section */}
        <Card className="glow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Users className="w-5 h-5" />
              Comunitatea Noastră
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Pelerini activi</span>
                <span className="font-bold text-accent">1.247</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Pelerinaje în curs</span>
                <span className="font-bold text-accent">8</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Discuții noi</span>
                <span className="font-bold text-accent">34</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Navigation />
    </div>
  );
};

export default Index;
