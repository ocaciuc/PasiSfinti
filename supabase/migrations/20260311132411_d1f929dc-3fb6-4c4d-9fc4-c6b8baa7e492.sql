CREATE POLICY "Users can update own candles"
ON public.candle_purchases
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);