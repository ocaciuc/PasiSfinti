import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Get the authorization header to verify the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a client with the user's JWT to get their identity
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get the authenticated user from the JWT
    const { data: { user: authenticatedUser }, error: authError } = await supabaseUser.auth.getUser();
    
    if (authError || !authenticatedUser) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authenticatedUserId = authenticatedUser.id;
    console.log('Authenticated user requesting deletion:', authenticatedUserId);

    // Create admin client with service role key for actual deletion
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Parse request body to check if user_id matches (optional validation)
    const body = await req.json().catch(() => ({}));
    const { user_id: requestedUserId } = body;
    
    // If a user_id was provided, verify it matches the authenticated user
    if (requestedUserId && requestedUserId !== authenticatedUserId) {
      console.error('User attempted to delete another account:', { 
        authenticatedUserId, 
        requestedUserId 
      });
      return new Response(
        JSON.stringify({ error: 'You can only delete your own account' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use the authenticated user's ID for deletion
    const targetUserId = authenticatedUserId;
    console.log('Proceeding with account deletion for user:', targetUserId);

    // Delete user data from all tables
    const tablesToClean = [
      'candle_purchases',
      'post_likes',
      'comments',
      'posts',
      'user_pilgrimages',
      'past_pilgrimages',
      'spiritual_diary_photos',
      'spiritual_diaries',
      'notification_settings',
      'notifications',
      'user_badges',
      'profiles',
      'user_roles'
    ];

    for (const table of tablesToClean) {
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq('user_id', targetUserId);
      
      if (error) {
        console.log(`Note: Error deleting from ${table}:`, error.message);
        // Continue anyway, the row might not exist
      } else {
        console.log(`Deleted user data from ${table}`);
      }
    }

    // Finally, delete the auth user
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

    if (deleteAuthError) {
      console.error('Error deleting auth user:', deleteAuthError);
      throw new Error('Failed to delete user account');
    }

    console.log('Successfully deleted user:', targetUserId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Account and all associated data have been permanently deleted.' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in delete-account function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred while deleting the account';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
