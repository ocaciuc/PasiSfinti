-- Create table for Orthodox calendar days
CREATE TABLE public.orthodox_calendar_days (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year integer NOT NULL,
  month integer NOT NULL,
  day_number integer NOT NULL,
  description text NOT NULL,
  color text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(year, month, day_number)
);

-- Enable RLS
ALTER TABLE public.orthodox_calendar_days ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read calendar data
CREATE POLICY "Anyone can view orthodox calendar days"
ON public.orthodox_calendar_days
FOR SELECT
USING (true);

-- Only admins can manage calendar data
CREATE POLICY "Admins can manage orthodox calendar days"
ON public.orthodox_calendar_days
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));