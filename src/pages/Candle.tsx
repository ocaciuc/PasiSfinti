import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import AnimatedCandle from "@/components/AnimatedCandle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Flame, CheckCircle2, Clock } from "lucide-react";
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
  acknowledgePurchase,
  consumePurchase,
  getOwnedPurchases,
  type ProductDetails,
  type PurchaseResult,
  type OwnedPurchase,
} from "@/lib/play-billing";

interface Candle {
  id: string;
  lit_at: string;
  expires_at: string;
  purpose: string | null;
  purchase_token?: string | null;
  payment_status?: string | null;
}

const normalizeOwnedPurchases = (owned: unknown): OwnedPurchase[] => {
  if (!Array.isArray(owned)) return [];

  return owned.filter((purchase): purchase is OwnedPurchase => {
    if (!purchase || typeof purchase !== "object") return false;

    const candidate = purchase as Partial<OwnedPurchase>;
    return (
      typeof candidate.purchaseToken === "string" &&
      typeof candidate.productId === "string" &&
      typeof candidate.purchaseTime === "number" &&
      typeof candidate.isAcknowledged === "boolean"
    );
  });
};

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
          setTimeRemaining(formatDistanceToNow(expiresAt, { locale: ro }));
        } else {
          // Candle expired — consume the Google Play purchase to allow re-purchase
          consumeExpiredCandle(activeCandle);
          setActiveCandle(null);
          fetchCandles();
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [activeCandle]);

  const consumeExpiredCandle = async (candle: Candle) => {
    if (!isNativeAndroid() || !candle.purchase_token) return;
    try {
      console.log("[Candle] Consuming expired candle purchase:", candle.purchase_token);
      await consumePurchase(candle.purchase_token);
    } catch (error) {
      console.error("[Candle] Failed to consume expired candle:", error);
    }
  };

  const initBilling = async () => {
    if (!isNativeAndroid()) return;
    try {
      const connected = await connectBilling();
      if (connected) {
        setBillingReady(true);
        const details = await getCandleProductDetails();
        if (details) setProductDetails(details);
        // Reconcile owned purchases with DB state
        await reconcileOwnedPurchases();
      }
    } catch (error) {
      console.error("Billing init error:", error);
    }
  };

  /**
   * Reconcile Google Play owned purchases with database state.
   * Handles PENDING → PURCHASED transitions and detects failed/expired pending purchases.
   */
  const reconcileOwnedPurchases = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const owned = normalizeOwnedPurchases(await getOwnedPurchases());
      const candleOwned = owned.filter(p => p.productId === "light_candle_5ron");

      // Get all pending candles from DB
      const { data: pendingCandles } = await supabase
        .from("candle_purchases")
        .select("*")
        .eq("user_id", user.id)
        .eq("payment_status", "pending")
        .gt("expires_at", new Date().toISOString());

      for (const purchase of candleOwned) {
        if (purchase.state === "PURCHASED") {
          // Check if there's a pending candle for this token → upgrade to completed
          const pendingForToken = pendingCandles?.find(c => c.purchase_token === purchase.purchaseToken);
          if (pendingForToken) {
            console.log("[Candle] PENDING → COMPLETED for token:", purchase.purchaseToken?.substring(0, 20));
            // Acknowledge if not yet
            if (!purchase.isAcknowledged) {
              await acknowledgePurchase(purchase.purchaseToken);
            }
            await supabase
              .from("candle_purchases")
              .update({
                payment_status: "completed",
                order_id: purchase.orderId || null,
              })
              .eq("id", pendingForToken.id);

            setActiveCandle({ ...pendingForToken, payment_status: "completed" });
            return;
          }

          // Check if there's a completed candle for this token
          const { data: completedCandle } = await supabase
            .from("candle_purchases")
            .select("*")
            .eq("user_id", user.id)
            .eq("purchase_token", purchase.purchaseToken)
            .eq("payment_status", "completed")
            .maybeSingle();

          if (completedCandle) {
            const expiresAt = new Date(completedCandle.expires_at);
            if (expiresAt > new Date()) {
              setActiveCandle(completedCandle);
            } else {
              console.log("[Candle] Consuming expired owned purchase");
              await consumePurchase(purchase.purchaseToken);
            }
          } else {
            // No record in DB — acknowledge and record
            if (!purchase.isAcknowledged) {
              await acknowledgePurchase(purchase.purchaseToken);
            }
            try {
              await verifyAndRecordPurchase(
                { ...purchase, state: 'PURCHASED' as const },
                ""
              );
            } catch (err) {
              console.warn("[Candle] Failed to restore unrecorded purchase:", err);
              await consumePurchase(purchase.purchaseToken);
            }
          }
        } else if (purchase.state === "PENDING") {
          // Still pending in Google Play — ensure we have a DB record
          const pendingForToken = pendingCandles?.find(c => c.purchase_token === purchase.purchaseToken);
          if (pendingForToken) {
            setActiveCandle(pendingForToken);
          }
        }
      }

      // Check for pending candles in DB that are NOT in Google Play anymore → payment failed
      if (pendingCandles && pendingCandles.length > 0) {
        for (const pendingCandle of pendingCandles) {
          if (!pendingCandle.purchase_token) continue;

          const stillInGooglePlay = candleOwned.some(p => p.purchaseToken === pendingCandle.purchase_token);
          if (!stillInGooglePlay) {
            console.log("[Candle] Pending candle not found in Google Play → marking as failed:", pendingCandle.id);
            await supabase
              .from("candle_purchases")
              .update({
                payment_status: "failed",
                expires_at: new Date().toISOString(),
              })
              .eq("id", pendingCandle.id);

            toast({
              title: "Plata nu a fost aprobată",
              description: "Lumânarea nu a putut fi aprinsă deoarece plata nu a fost aprobată. Te rugăm să încerci din nou.",
              variant: "destructive",
            });
          }
        }
      }

      // Refresh candles after reconciliation
      await fetchCandles();
    } catch (error) {
      console.error("Reconcile owned purchases error:", error);
    }
  };

  const fetchCandles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch active candle: both 'completed' and 'pending' are considered active
      const { data: activeData, error: activeError } = await supabase
        .from("candle_purchases")
        .select("*")
        .eq("user_id", user.id)
        .in("payment_status", ["completed", "pending"])
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

  const getLatestCompletedCandleWithToken = async (userId: string) => {
    const { data, error } = await supabase
      .from("candle_purchases")
      .select("id, lit_at, expires_at, purpose, purchase_token")
      .eq("user_id", userId)
      .in("payment_status", ["completed", "pending"])
      .not("purchase_token", "is", null)
      .order("lit_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[Candle] Failed to fetch latest candle:", error);
      return null;
    }

    return data;
  };

  const releaseExpiredOwnedPurchaseFromDatabase = async (userId: string): Promise<boolean> => {
    const latestCandle = await getLatestCompletedCandleWithToken(userId);

    if (!latestCandle?.purchase_token) {
      return false;
    }

    const isStillActive = new Date(latestCandle.expires_at) > new Date();
    if (isStillActive) {
      setActiveCandle(latestCandle);
      return false;
    }

    console.log("[Candle] Releasing expired purchase from stored token:", latestCandle.purchase_token);
    const consumed = await consumePurchase(latestCandle.purchase_token);

    if (!consumed) {
      console.warn("[Candle] Failed to consume stored expired purchase token (may be auto-refunded)");
    }

    await fetchCandles();
    return true;
  };

  const verifyAndRecordPurchase = async (purchase: PurchaseResult, purpose: string) => {
    console.log("[Candle] Calling verify-purchase with:", {
      purchaseToken: purchase.purchaseToken?.substring(0, 20) + "...",
      orderId: purchase.orderId,
      productId: purchase.productId,
    });

    const { data, error } = await supabase.functions.invoke("verify-purchase", {
      body: {
        purchaseToken: purchase.purchaseToken,
        orderId: purchase.orderId,
        productId: purchase.productId || "light_candle_5ron",
        purchaseTime: purchase.purchaseTime,
        purpose: purpose || "Pentru pace și binecuvântare",
      },
    });

    if (error) {
      console.error("[Candle] verify-purchase error:", error);
      throw error;
    }
    if (!data?.success && !data?.candle) {
      console.error("[Candle] verify-purchase unexpected response:", data);
      throw new Error(data?.error || "Verification failed");
    }

    console.log("[Candle] verify-purchase success, candle:", data.candle?.id);
    return data.candle;
  };

  const handleLightCandle = () => {
    if (activeCandle) {
      toast({
        title: "Ai deja o lumânare aprinsă",
        description: "Poți aprinde alta după ce aceasta se stinge.",
      });
      return;
    }
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

      // Double-check: no active candle (completed or pending) in Supabase
      const { data: existingActive } = await supabase
        .from("candle_purchases")
        .select("id, expires_at")
        .eq("user_id", user.id)
        .in("payment_status", ["completed", "pending"])
        .gt("expires_at", new Date().toISOString())
        .limit(1)
        .maybeSingle();

      if (existingActive) {
        toast({
          title: "Ai deja o lumânare aprinsă",
          description: "Poți aprinde alta după ce aceasta se stinge.",
        });
        return;
      }

      if (isNativeAndroid()) {
        if (!billingReady) {
          const connectedNow = await connectBilling();
          setBillingReady(connectedNow);

          if (!connectedNow) {
            toast({
              title: "Serviciul Google Play nu este disponibil",
              description: "Verifică conexiunea și încearcă din nou.",
              variant: "destructive",
            });
            return;
          }
        }

        // Check if user already owns the item (from a previous unfinished flow)
        const owned = normalizeOwnedPurchases(await getOwnedPurchases());
        const existingOwned = owned.find((p) => p.productId === "light_candle_5ron");

        if (existingOwned) {
          const { data: existingCandle } = await supabase
            .from("candle_purchases")
            .select("*")
            .eq("user_id", user.id)
            .in("payment_status", ["completed", "pending"])
            .gt("expires_at", new Date().toISOString())
            .limit(1)
            .maybeSingle();

          if (existingCandle) {
            setActiveCandle(existingCandle);
            toast({
              title: "Ai deja o lumânare aprinsă",
              description: "Poți aprinde alta după ce aceasta se stinge.",
            });
            return;
          }

          // No active candle — try to consume the stale purchase
          console.log("[Candle] Consuming stale owned purchase before new purchase");
          const consumed = await consumePurchase(existingOwned.purchaseToken);
          if (!consumed) {
            console.warn("[Candle] Failed to consume stale purchase, proceeding anyway");
          }
        } else {
          await releaseExpiredOwnedPurchaseFromDatabase(user.id);
          if (activeCandle) return;
        }

        // Create pending record BEFORE payment
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

        // Initiate Google Play payment
        let purchaseResult: PurchaseResult;
        try {
          purchaseResult = await purchaseCandle();
        } catch (purchaseError: any) {
          console.error("Purchase error:", purchaseError);

          // Mark pending record as failed
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

        // Handle ITEM_ALREADY_OWNED
        if (purchaseResult.state === "ITEM_ALREADY_OWNED") {
          await supabase
            .from("candle_purchases")
            .update({ payment_status: "failed", expires_at: new Date().toISOString() })
            .eq("id", pendingCandle.id);

          console.log("[Candle] ITEM_ALREADY_OWNED during purchase, consuming stale item");
          const ownedList = normalizeOwnedPurchases(await getOwnedPurchases());
          let released = false;

          for (const p of ownedList) {
            if (p.productId === "light_candle_5ron") {
              released = await consumePurchase(p.purchaseToken);
              if (released) break;
            }
          }

          if (!released) {
            released = await releaseExpiredOwnedPurchaseFromDatabase(user.id);
          }

          toast({
            title: released ? "Achiziție anterioară eliberată" : "Achiziția anterioară nu a putut fi eliberată",
            description: released
              ? "Poți aprinde acum o lumânare nouă."
              : "Te rugăm să încerci din nou.",
            variant: released ? "default" : "destructive",
          });
          return;
        }

        // Handle PENDING state — candle is immediately active with pending payment
        if (purchaseResult.state === "PENDING") {
          console.log("[Candle] Purchase PENDING — showing candle as active");
          // Update the pending record with the purchase token
          await supabase
            .from("candle_purchases")
            .update({
              purchase_token: purchaseResult.purchaseToken,
            })
            .eq("id", pendingCandle.id);

          setActiveCandle({
            id: pendingCandle.id,
            lit_at: pendingCandle.lit_at,
            expires_at: pendingCandle.expires_at,
            purpose: pendingCandle.purpose,
            purchase_token: purchaseResult.purchaseToken,
            payment_status: "pending",
          });

          setPrayer("");
          setShowThankYou(true);
          return;
        }

        // PURCHASED state — acknowledge and record
        await acknowledgePurchase(purchaseResult.purchaseToken);

        try {
          const candle = await verifyAndRecordPurchase(purchaseResult, candlePurpose);
          // Mark the pending record as superseded
          await supabase
            .from("candle_purchases")
            .update({ payment_status: "superseded", expires_at: new Date().toISOString() })
            .eq("id", pendingCandle.id);

          setActiveCandle(candle);
        } catch (verifyError) {
          console.error("Verification error, updating pending record:", verifyError);
          await supabase
            .from("candle_purchases")
            .update({
              payment_status: "completed",
              purchase_token: purchaseResult.purchaseToken,
              order_id: purchaseResult.orderId,
            })
            .eq("id", pendingCandle.id);

          setActiveCandle({
            id: pendingCandle.id,
            lit_at: pendingCandle.lit_at,
            expires_at: pendingCandle.expires_at,
            purpose: pendingCandle.purpose,
            purchase_token: purchaseResult.purchaseToken,
            payment_status: "completed",
          });
        }

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
  const isPending = activeCandle?.payment_status === "pending";

  return (
    <div className="min-h-screen bg-background pb-safe">
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
                {isPending && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-secondary rounded-lg p-3 mt-2">
                    <Clock className="w-4 h-4" />
                    <span>Plata este în curs de procesare</span>
                  </div>
                )}
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

              {isPending && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-secondary rounded-lg p-3">
                  <Clock className="w-4 h-4" />
                  <span>Plata este în curs de procesare</span>
                </div>
              )}

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
