-- Import 2026 Orthodox Calendar Data
-- HOW TO USE:
-- 1. Open the Supabase SQL Editor
-- 2. Copy the ENTIRE content of docs/calendar_with_comments_2026.json
-- 3. Paste it in place of the { PASTE_JSON_HERE } placeholder below
-- 4. Run the script

DO $$
DECLARE
  calendar_json JSONB;
  month_key TEXT;
  day_data JSONB;
  inserted_count INTEGER := 0;
BEGIN
  -- Step 1: Delete all 2025 data
  DELETE FROM public.orthodox_calendar_days WHERE year = 2025;
  RAISE NOTICE 'Deleted all 2025 calendar data';

  -- Step 2: Parse the 2026 JSON
  -- IMPORTANT: Replace the placeholder below with the full JSON from docs/calendar_with_comments_2026.json
  calendar_json := $json$
{ PASTE_JSON_HERE }
  $json$;

  -- Step 3: Loop through months and days, inserting data
  FOR month_key IN SELECT jsonb_object_keys(calendar_json->'2026')
  LOOP
    FOR day_data IN SELECT jsonb_array_elements(calendar_json->'2026'->month_key)
    LOOP
      INSERT INTO public.orthodox_calendar_days (year, month, day_number, description, color, comments, post)
      VALUES (
        2026,
        month_key::INTEGER,
        (day_data->>'dayNumber')::INTEGER,
        COALESCE(TRIM(day_data->>'description'), ''),
        day_data->>'color',
        day_data->>'comment',
        day_data->>'post'
      )
      ON CONFLICT (year, month, day_number) DO UPDATE SET
        description = EXCLUDED.description,
        color = EXCLUDED.color,
        comments = EXCLUDED.comments,
        post = EXCLUDED.post;

      inserted_count := inserted_count + 1;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Inserted/updated % calendar days for 2026', inserted_count;
END $$;
