import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import AnimatedCandle from "@/components/AnimatedCandle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Flame, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";

interface Candle {
  id: string;
  lit_at: string;
  expires_at: string;
  purpose: string | null;
}

const Candle = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [prayer, setPrayer] = useState("");
  const [activeCandle, setActiveCandle] = useState<Candle | null>(null);
  const [candleHistory, setCandleHistory] = useState<Candle[]>([]);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCandles();
  }, []);

  useEffect(() => {
    if (activeCandle) {
      const interval = setInterval(() => {
        const expiresAt = new Date(activeCandle.expires_at);
        const now = new Date();
        
        if (expiresAt > now) {
          setTimeRemaining(formatDistanceToNow(expiresAt, { locale: ro, addSuffix: true }));
        } else {
          setActiveCandle(null);
          fetchCandles();
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [activeCandle]);

  const fetchCandles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch active candle
      const { data: activeData, error: activeError } = await supabase
        .from("candle_purchases")
        .select("*")
        .eq("user_id", user.id)
        .gt("expires_at", new Date().toISOString())
        .order("lit_at", { ascending: false })
        .limit(1)
        .single();

      if (activeError && activeError.code !== "PGRST116") {
        console.error("Error fetching active candle:", activeError);
      } else if (activeData) {
        setActiveCandle(activeData);
      }

      // Fetch candle history (expired candles)
      const { data: historyData, error: historyError } = await supabase
        .from("candle_purchases")
        .select("*")
        .eq("user_id", user.id)
        .lte("expires_at", new Date().toISOString())
        .order("lit_at", { ascending: false })
        .limit(10);

      if (historyError) {
        console.error("Error fetching candle history:", historyError);
      } else if (historyData) {
        setCandleHistory(historyData);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLightCandle = async () => {
    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("candle_purchases")
        .insert({
          user_id: user.id,
          lit_at: now,
          expires_at: expiresAt,
          purpose: prayer || "Pentru pace și binecuvântare",
          amount: 5,
          payment_status: "completed",
        })
        .select()
        .single();

      if (error) throw error;

      setActiveCandle(data);
      setPrayer("");
      
      toast({
        title: "Lumânarea ta arde",
        description: "Rugăciunea ta a fost primită. Lumânarea va arde 24 de ore.",
      });
    } catch (error) {
      console.error("Error lighting candle:", error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut aprinde lumânarea. Încearcă din nou.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-32">
        <header className="bg-primary text-primary-foreground p-6 glow-soft">
          <h1 className="text-2xl font-bold text-center">Aprinde o Lumânare</h1>
        </header>
        <div className="max-w-lg mx-auto p-4 space-y-4">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
        <Navigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-6 glow-soft">
        <h1 className="text-2xl font-bold text-center">Aprinde o Lumânare</h1>
        <p className="text-center text-sm opacity-90 mt-1">
          Ridică o rugăciune către cer
        </p>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {activeCandle ? (
          <Card className="glow-candle bg-gradient-to-br from-accent/10 via-background to-background overflow-hidden">
            <CardContent className="pt-8 text-center space-y-6">
              <div className="relative flex justify-center">
                <AnimatedCandle size="lg" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-accent">
                  Lumânarea ta arde
                </h2>
                <p className="text-muted-foreground">
                  Rugăciunea ta luminează calea
                </p>
              </div>

              <div className="bg-card rounded-lg p-4 border border-accent/20">
                <p className="text-sm text-muted-foreground mb-1">
                  Timp rămas
                </p>
                <p className="text-2xl font-bold text-accent">
                  {timeRemaining}
                </p>
              </div>

              <div className="pt-4">
                <p className="text-sm text-muted-foreground italic">
                  "Lumina lumânării simbolizează rugăciunea noastră către Dumnezeu"
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="glow-soft">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Flame className="w-16 h-16 text-accent/40" />
              </div>
              <CardTitle className="text-primary">
                Aprinde o Lumânare Virtuală
              </CardTitle>
              <CardDescription>
                Lumânarea ta va arde 24 de ore și va simboliza rugăciunea ta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Rugăciunea ta (opțional)
                </label>
                <Textarea
                  value={prayer}
                  onChange={(e) => setPrayer(e.target.value)}
                  placeholder="Pentru sănătate, pace și bunăstare..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="bg-secondary rounded-lg p-4 text-sm text-muted-foreground">
                <p className="mb-2">
                  Aprinderea unei lumânări virtuale este un gest simbolic de rugăciune 
                  și contemplare spirituală.
                </p>
                <p className="text-accent font-medium">
                  Donație sugerată: 5 RON
                </p>
              </div>

              <Button
                onClick={handleLightCandle}
                disabled={submitting}
                className="w-full h-12 text-lg"
              >
                <Flame className="w-5 h-5 mr-2" />
                {submitting ? "Se aprinde..." : "Aprinde Lumânarea"}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Donațiile susțin comunitatea și lucrările de caritate
              </p>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="glow-soft">
          <CardHeader>
            <CardTitle className="text-lg text-primary">
              Despre Lumânarea Virtuală
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              În tradiția ortodoxă, lumânarea aprinsă simbolizează rugăciunea 
              credinciosului care se înalță către cer.
            </p>
            <p>
              Prin aprinderea unei lumânări virtuale, îți manifești intenția 
              spirituală și sprijini comunitatea de pelerini.
            </p>
          </CardContent>
        </Card>

        {/* Candle History */}
        {candleHistory.length > 0 && (
          <Card className="glow-soft">
            <CardHeader>
              <CardTitle className="text-lg text-primary">
                Istoricul Lumânărilor
              </CardTitle>
              <CardDescription>
                Rugăciunile tale anterioare
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {candleHistory.map((candle) => (
                <div
                  key={candle.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border/50"
                >
                  <Flame className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {candle.purpose || "Pentru pace și binecuvântare"}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>
                        {new Date(candle.lit_at).toLocaleDateString("ro-RO", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <Navigation />
    </div>
  );
};

export default Candle;
