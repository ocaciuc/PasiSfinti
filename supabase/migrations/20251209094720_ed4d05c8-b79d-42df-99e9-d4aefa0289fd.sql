-- Add bio field to profiles table for self-description
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;