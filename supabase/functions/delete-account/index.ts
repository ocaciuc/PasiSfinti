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
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { user_id, email } = await req.json();
    
    console.log('Delete account request received:', { user_id, email });

    let targetUserId = user_id;

    // If email provided instead of user_id, look up the user
    if (!targetUserId && email) {
      console.log('Looking up user by email:', email);
      const { data: users, error: lookupError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (lookupError) {
        console.error('Error looking up users:', lookupError);
        throw new Error('Failed to look up user');
      }

      const user = users.users.find(u => u.email === email);
      if (!user) {
        console.log('No user found with email:', email);
        return new Response(
          JSON.stringify({ success: true, message: 'If an account exists with this email, it will be deleted.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      targetUserId = user.id;
    }

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'Either user_id or email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Deleting user data for user_id:', targetUserId);

    // Delete user data from all tables (cascade will handle most, but let's be explicit)
    const tablesToClean = [
      'candle_purchases',
      'post_likes',
      'comments',
      'posts',
      'user_pilgrimages',
      'past_pilgrimages',
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
