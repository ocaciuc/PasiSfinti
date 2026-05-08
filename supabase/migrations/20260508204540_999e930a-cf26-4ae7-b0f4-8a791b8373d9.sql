-- Schedule daily holiday push notifications at 06:00 UTC (≈08:00 Bucharest)
SELECT cron.schedule(
  'daily-holiday-notifications',
  '0 6 * * *',
  $$
  select net.http_post(
    url:='https://yanjhfqqdcevlzmwsrnj.supabase.co/functions/v1/holiday-notifications',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhbmpoZnFxZGNldmx6bXdzcm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNDcyNDMsImV4cCI6MjA3OTcyMzI0M30.DQ6QVhTfyzjnm5PriySvRfY1D8X6XsIJYStCQ6tX_Rc"}'::jsonb,
    body:=concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);