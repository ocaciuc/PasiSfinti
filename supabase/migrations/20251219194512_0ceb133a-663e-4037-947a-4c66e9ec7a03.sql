-- Fix the delete_user_account function to add authorization check
-- This ensures only the authenticated user can delete their own account

CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_timestamp_val timestamp with time zone := now();
BEGIN
  -- SECURITY: Verify the caller is deleting their own account
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only delete your own account';
  END IF;

  -- Soft delete all user content
  
  -- Soft delete posts
  UPDATE public.posts 
  SET deleted_at = current_timestamp_val 
  WHERE user_id = target_user_id AND deleted_at IS NULL;
  
  -- Soft delete comments
  UPDATE public.comments 
  SET deleted_at = current_timestamp_val 
  WHERE user_id = target_user_id AND deleted_at IS NULL;
  
  -- Soft delete post likes
  UPDATE public.post_likes 
  SET deleted_at = current_timestamp_val 
  WHERE user_id = target_user_id AND deleted_at IS NULL;
  
  -- Soft delete user pilgrimages
  UPDATE public.user_pilgrimages 
  SET deleted_at = current_timestamp_val 
  WHERE user_id = target_user_id AND deleted_at IS NULL;
  
  -- Soft delete past pilgrimages
  UPDATE public.past_pilgrimages 
  SET deleted_at = current_timestamp_val 
  WHERE user_id = target_user_id AND deleted_at IS NULL;
  
  -- Soft delete candle purchases
  UPDATE public.candle_purchases 
  SET deleted_at = current_timestamp_val 
  WHERE user_id = target_user_id AND deleted_at IS NULL;
  
  -- Hard delete notifications (transient data)
  DELETE FROM public.notifications WHERE user_id = target_user_id;
  
  -- Delete notification settings
  DELETE FROM public.notification_settings WHERE user_id = target_user_id;
  
  -- Delete user roles
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  
  -- Soft delete and anonymize profile
  UPDATE public.profiles 
  SET 
    deleted_at = current_timestamp_val,
    is_deleted = true,
    first_name = 'Deleted',
    last_name = 'User',
    bio = NULL,
    avatar_url = NULL,
    city = NULL,
    parish = NULL
  WHERE user_id = target_user_id;
  
  RETURN true;
END;
$function$;