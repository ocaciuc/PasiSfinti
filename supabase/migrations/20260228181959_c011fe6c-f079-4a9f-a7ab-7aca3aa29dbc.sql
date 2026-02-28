-- Add purchase_token and order_id columns to candle_purchases for Google Play verification
ALTER TABLE public.candle_purchases
ADD COLUMN IF NOT EXISTS purchase_token text,
ADD COLUMN IF NOT EXISTS order_id text;

-- Create unique index on purchase_token to prevent duplicate consumption
CREATE UNIQUE INDEX IF NOT EXISTS idx_candle_purchases_purchase_token
ON public.candle_purchases (purchase_token)
WHERE purchase_token IS NOT NULL;
