import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import AnimatedCandle from "@/components/AnimatedCandle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Flame, Clock, CheckCircle2 } from "lucide-react";
import { CandleHistory } from "@/components/CandleHistory";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  isNativeAndroid,
  connectBilling,
  getCandleProductDetails,
  purchaseCandle,
  consumePurchase,
  getPendingPurchases,
  type ProductDetails,
  type PurchaseResult,
} from "@/lib/play-billing";

interface Candle {
  id: string;
  lit_at: string;
  expires_at: string;
  purpose: string | null;
}

const CandlePage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [prayer, setPrayer] = useState("");
  const [activeCandle, setActiveCandle] = useState<Candle | null>(null);
  const [candleHistory, setCandleHistory] = useState<Candle[]>([]);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [billingReady, setBillingReady] = useState(false);
  const [productDetails, setProductDetails] = useState<ProductDetails | null>(null);

  useEffect(() => {
    fetchCandles();
    initBilling();
  }, []);

  useEffect(() => {
    if (activeCandle) {
      const interval = setInterval(() => {
        const expiresAt = new Date(activeCandle.expires_at);
        const now = new Date();

        if (expiresAt > now) {
          setTimeRemaining("" + formatDistanceToNow(expiresAt, { locale: ro }));
        } else {
          setActiveCandle(null);
          fetchCandles();
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [activeCandle]);

  const initBilling = async () => {
    if (!isNativeAndroid()) return;
    try {
      const connected = await connectBilling();
      if (connected) {
        setBillingReady(true);
        const details = await getCandleProductDetails();
        if (details) setProductDetails(details);
        // Handle any pending purchases from previous sessions
        await handlePendingPurchases();
      }
    } catch (error) {
      console.error("Billing init error:", error);
    }
  };

  const handlePendingPurchases = async () => {
    try {
      const pending = await getPendingPurchases();
      for (const purchase of pending) {
        try {
          await verifyAndRecordPurchase(purchase, "");
        } catch (err) {
          // If verify fails (e.g. duplicate), still consume to unblock future purchases
          console.warn("Pending purchase verify failed, consuming anyway:", err);
          await consumePurchase(purchase.purchaseToken);
        }
      }
    } catch (error) {
      console.error("Pending purchases error:", error);
    }
  };

  /**
   * Consume all owned items to clear the "You already own this item" state.
   * This should be called before initiating a new purchase.
   */
  const consumeAllPending = async () => {
    try {
      const pending = await getPendingPurchases();
      for (const purchase of pending) {
        console.log("[Candle] Consuming pending purchase:", purchase.purchaseToken);
        await consumePurchase(purchase.purchaseToken);
      }
    } catch (error) {
      console.error("Error consuming pending purchases:", error);
    }
  };

  const fetchCandles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: activeData, error: activeError } = await supabase
        .from("candle_purchases")
        .select("*")
        .eq("user_id", user.id)
        .eq("payment_status", "completed")
        .gt("expires_at", new Date().toISOString())
        .order("lit_at", { ascending: false })
        .limit(1)
        .single();

      if (activeError && activeError.code !== "PGRST116") {
        console.error("Error fetching active candle:", activeError);
      } else if (activeData) {
        setActiveCandle(activeData);
      }

      const { data: historyData, error: historyError } = await supabase
        .from("candle_purchases")
        .select("*")
        .eq("user_id", user.id)
        .eq("payment_status", "completed")
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

  const verifyAndRecordPurchase = async (purchase: PurchaseResult, purpose: string) => {
    const { data, error } = await supabase.functions.invoke("verify-purchase", {
      body: {
        purchaseToken: purchase.purchaseToken,
        orderId: purchase.orderId,
        productId: purchase.productId,
        purpose: purpose || "Pentru pace și binecuvântare",
      },
    });

    if (error) throw error;
    if (!data?.success && !data?.candle) {
      throw new Error(data?.error || "Verification failed");
    }

    // Consume so user can buy again
    await consumePurchase(purchase.purchaseToken);

    return data.candle;
  };

  const handleLightCandle = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmPurchase = async () => {
    setShowConfirmDialog(false);
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      if (isNativeAndroid() && billingReady) {
        // Step 1: Pre-validate by creating a pending candle record BEFORE payment
        const now = new Date().toISOString();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const candlePurpose = prayer || "Pentru pace și binecuvântare";

        const { data: pendingCandle, error: pendingError } = await supabase
          .from("candle_purchases")
          .insert({
            user_id: user.id,
            lit_at: now,
            expires_at: expiresAt,
            purpose: candlePurpose,
            amount: 5,
            payment_status: "pending",
          })
          .select()
          .single();

        if (pendingError) {
          console.error("Error creating pending candle:", pendingError);
          toast({
            title: "Eroare",
            description: "Nu s-a putut pregăti lumânarea. Plata nu a fost efectuată.",
            variant: "destructive",
          });
          return;
        }

        // Step 2: Now initiate Google Play payment
        let purchaseResult: PurchaseResult;
        try {
          purchaseResult = await purchaseCandle();
        } catch (purchaseError: any) {
          // Payment failed or cancelled — mark the pending record as failed
          console.error("Purchase error:", purchaseError);
          await supabase
            .from("candle_purchases")
            .update({ payment_status: "failed", expires_at: new Date().toISOString() })
            .eq("id", pendingCandle.id);

          if (purchaseError?.message?.includes("cancelled") || purchaseError?.code === "USER_CANCELED") {
            return;
          }
          toast({
            title: "Plata nu a fost efectuată",
            description: "Lumânarea nu a fost aprinsă. Nu ai fost taxat.",
            variant: "destructive",
          });
          return;
        }

        if (purchaseResult.state === "PENDING") {
          toast({
            title: "Tranzacție în așteptare",
            description: "Plata ta este în curs de procesare. Lumânarea va fi aprinsă după confirmare.",
          });
          return;
        }

        // Step 3: Verify purchase and update candle record
        try {
          await verifyAndRecordPurchase(purchaseResult, candlePurpose);
        } catch (verifyError) {
          // Verification failed but payment went through — update existing record
          console.error("Verification error, updating pending record:", verifyError);
          await supabase
            .from("candle_purchases")
            .update({
              payment_status: "completed",
              purchase_token: purchaseResult.purchaseToken,
              order_id: purchaseResult.orderId,
            })
            .eq("id", pendingCandle.id);

          // Still consume so user can buy again
          await consumePurchase(purchaseResult.purchaseToken);
        }

        setActiveCandle({
          id: pendingCandle.id,
          lit_at: pendingCandle.lit_at,
          expires_at: pendingCandle.expires_at,
          purpose: pendingCandle.purpose,
        });
        setPrayer("");
        setShowThankYou(true);
      } else {
        // Web/fallback flow (no real payment)
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
        setShowThankYou(true);
      }
    } catch (error: any) {
      console.error("Error lighting candle:", error);
      if (error?.message?.includes("cancelled") || error?.code === "USER_CANCELED") {
        return;
      }
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
      <div className="min-h-screen bg-background pb-safe">
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

  const displayPrice = productDetails?.price || "5 RON";

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-6 glow-soft">
        <h1 className="text-2xl font-bold text-center">Aprinde o Lumânare</h1>
        <p className="text-center text-sm opacity-90 mt-1">Ridică o rugăciune către cer</p>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {showThankYou ? (
          <Card className="glow-candle bg-gradient-to-br from-accent/10 via-background to-background overflow-hidden">
            <CardContent className="pt-8 text-center space-y-6">
              <div className="relative flex justify-center">
                <AnimatedCandle size="lg" />
              </div>
              <div className="flex justify-center">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-accent">Mulțumim pentru gestul tău!</h2>
                <p className="text-muted-foreground">
                  Lumânarea ta arde acum și luminează drumul pelerinilor.
                </p>
                <p className="text-sm text-muted-foreground italic mt-4">
                  "Fiecare lumânare aprinsă este o rugăciune care se înalță către cer"
                </p>
              </div>
              <Button
                onClick={() => setShowThankYou(false)}
                variant="outline"
                className="mt-4"
              >
                Vezi lumânarea ta
              </Button>
            </CardContent>
          </Card>
        ) : activeCandle ? (
          <Card className="glow-candle bg-gradient-to-br from-accent/10 via-background to-background overflow-hidden">
            <CardContent className="pt-8 text-center space-y-6">
              <div className="relative flex justify-center">
                <AnimatedCandle size="lg" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-accent">Lumânarea ta arde</h2>
                <p className="text-muted-foreground">Rugăciunea ta luminează calea</p>
              </div>

              <div className="bg-card rounded-lg p-4 border border-accent/20">
                <p className="text-sm text-muted-foreground mb-1">Timp rămas</p>
                <p className="text-2xl font-bold text-accent">{timeRemaining}</p>
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
              <CardTitle className="text-primary">Aprinde o Lumânare Virtuală</CardTitle>
              <CardDescription>Lumânarea ta va arde 24 de ore și va simboliza rugăciunea ta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Rugăciunea ta (opțional)</label>
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
                  Aprinderea unei lumânări virtuale este un gest simbolic de rugăciune și contemplare spirituală.
                </p>
                <p className="text-accent font-medium">Donație: {displayPrice}</p>
              </div>

              <Button onClick={handleLightCandle} disabled={submitting} className="w-full h-12 text-lg">
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
            <CardTitle className="text-lg text-primary">Despre Lumânarea Virtuală</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              În tradiția ortodoxă, lumânarea aprinsă simbolizează rugăciunea credinciosului care se înalță către cer.
            </p>
            <p>
              Prin aprinderea unei lumânări virtuale, îți manifești intenția spirituală și sprijini comunitatea de
              pelerini.
            </p>
          </CardContent>
        </Card>

        {/* Candle History */}
        {candleHistory.length > 0 && (
          <CandleHistory candles={candleHistory} />
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">Aprinde o Lumânare</AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-3">
              <span className="block">
                Ești pe cale să aprinzi o lumânare virtuală care va arde 24 de ore.
              </span>
              <span className="block text-accent font-semibold text-base">
                Donație: {displayPrice}
              </span>
              {prayer && (
                <span className="block text-xs italic">
                  Rugăciunea ta: "{prayer.substring(0, 100)}{prayer.length > 100 ? '...' : ''}"
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPurchase}>
              <Flame className="w-4 h-4 mr-2" />
              Confirmă
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Navigation />
    </div>
  );
};

export default CandlePage;
