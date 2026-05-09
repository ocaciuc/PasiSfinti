
-- Revoke from PUBLIC (default grant) for all SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.get_profiles_by_ids(uuid, uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_co_pilgrim_profiles(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.evaluate_and_award_badges(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_enrolled_in_pilgrimage(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_candle_expiry() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_pilgrimage_reminders() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_pilgrimage_starting_soon() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fail_stale_pending_candles() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_on_comment_reply() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_candle_expiration() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_post_likes_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_pilgrimage_participant_count() FROM PUBLIC, anon, authenticated;

-- Re-grant only to the roles that need them
GRANT EXECUTE ON FUNCTION public.get_profiles_by_ids(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_co_pilgrim_profiles(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_and_award_badges(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_enrolled_in_pilgrimage(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Tighten public bucket avatar listing again (in case the previous run kept default grants)
-- Already done in previous migration, no-op safe block.
