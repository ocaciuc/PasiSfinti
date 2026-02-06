-- Add comments and post columns to orthodox_calendar_days
ALTER TABLE public.orthodox_calendar_days
ADD COLUMN IF NOT EXISTS comments text,
ADD COLUMN IF NOT EXISTS post text;