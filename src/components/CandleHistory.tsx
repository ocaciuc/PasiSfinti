import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Flame, Clock, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Candle {
  id: string;
  lit_at: string;
  expires_at: string;
  purpose: string | null;
}

const PREVIEW_COUNT = 2;

const CandleHistoryItem = ({ candle }: { candle: Candle }) => (
  <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border/50">
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
);

export const CandleHistory = ({ candles }: { candles: Candle[] }) => {
  const [expanded, setExpanded] = useState(false);
  const hasMore = candles.length > PREVIEW_COUNT;
  const visibleCandles = expanded ? candles : candles.slice(0, PREVIEW_COUNT);
  const hiddenCount = candles.length - PREVIEW_COUNT;

  return (
    <Card className="glow-soft">
      <CardHeader>
        <CardTitle className="text-lg text-primary">Istoricul Lumânărilor</CardTitle>
        <CardDescription>Rugăciunile tale anterioare</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {candles.slice(0, PREVIEW_COUNT).map((candle) => (
          <CandleHistoryItem key={candle.id} candle={candle} />
        ))}

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="history-expanded"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden space-y-3"
            >
              {candles.slice(PREVIEW_COUNT).map((candle) => (
                <CandleHistoryItem key={candle.id} candle={candle} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {hasMore && (
          <button
            onClick={() => setExpanded((prev) => !prev)}
            className="w-full flex items-center justify-center gap-2 pt-2 text-sm text-primary font-medium active:opacity-70 transition-opacity"
          >
            <span>{expanded ? "Arată mai puțin" : `Arată toate (${hiddenCount} în plus)`}</span>
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </button>
        )}
      </CardContent>
    </Card>
  );
};
