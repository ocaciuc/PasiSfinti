-- =============================================
-- PART 1: Add soft delete and audit columns to all tables
-- =============================================

-- Add deleted_at to posts
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

-- Add deleted_at to comments
ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

-- Add deleted_at to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

-- Add is_deleted flag to profiles for quick filtering
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

-- Add deleted_at to pilgrimages
ALTER TABLE public.pilgrimages 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

-- Add deleted_at to user_pilgrimages
ALTER TABLE public.user_pilgrimages 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

-- Add deleted_at to candle_purchases
ALTER TABLE public.candle_purchases 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

-- Add deleted_at to past_pilgrimages
ALTER TABLE public.past_pilgrimages 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

-- Add deleted_at to post_likes
ALTER TABLE public.post_likes 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

-- =============================================
-- PART 2: Create Notifications System Tables
-- =============================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  data jsonb DEFAULT '{}',
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  read_at timestamp with time zone DEFAULT NULL
);

-- Create notification_settings table
CREATE TABLE IF NOT EXISTS public.notification_settings (
  user_id uuid PRIMARY KEY,
  allow_push boolean DEFAULT true,
  allow_email boolean DEFAULT false,
  pilgrimage_reminders boolean DEFAULT true,
  community_updates boolean DEFAULT true,
  comment_replies boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on notification tables
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- RLS policies for notification_settings
CREATE POLICY "Users can view own notification settings"
ON public.notification_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings"
ON public.notification_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
ON public.notification_settings FOR UPDATE
USING (auth.uid() = user_id);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Trigger for notification_settings updated_at
DROP TRIGGER IF EXISTS update_notification_settings_updated_at ON public.notification_settings;
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- PART 3: Performance indexes for soft deletes
-- =============================================

CREATE INDEX IF NOT EXISTS idx_posts_deleted_at ON public.posts(deleted_at);
CREATE INDEX IF NOT EXISTS idx_comments_deleted_at ON public.comments(deleted_at);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at);
CREATE INDEX IF NOT EXISTS idx_user_pilgrimages_deleted_at ON public.user_pilgrimages(deleted_at);
CREATE INDEX IF NOT EXISTS idx_pilgrimages_deleted_at ON public.pilgrimages(deleted_at);