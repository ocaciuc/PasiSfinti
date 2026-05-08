ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS holiday_notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS quiet_hours_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quiet_hours_start time NOT NULL DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_end time NOT NULL DEFAULT '08:00';