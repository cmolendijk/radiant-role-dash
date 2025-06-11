
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteRequest {
  action: 'create' | 'list' | 'revoke' | 'accept';
  email?: string;
  role?: string;
  inviteId?: string;
  token?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user's JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user has admin role
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole || !['admin', 'owner'].includes(userRole.role)) {
      throw new Error('Insufficient permissions');
    }

    const requestBody: InviteRequest = await req.json();
    const { action } = requestBody;

    if (action === 'create') {
      const { email, role } = requestBody;
      
      if (!email || !role) {
        throw new Error('Email and role are required');
      }

      // Check if user already exists
      const { data: existingUser } = await supabase.auth.admin.getUserByEmail(email);
      if (existingUser.user) {
        throw new Error('User already exists in the system');
      }

      // Create invite record (you'll need to create this table)
      const inviteToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      const { data: invite, error: inviteError } = await supabase
        .from('invites')
        .insert({
          email,
          role,
          token: inviteToken,
          expires_at: expiresAt.toISOString(),
          invited_by: user.id,
          status: 'pending'
        })
        .select()
        .single();

      if (inviteError) {
        console.error('Invite creation error:', inviteError);
        throw new Error('Failed to create invite');
      }

      // Here you would typically send an email with the invite link
      // For now, we'll just return success
      console.log(`Invite created for ${email} with token ${inviteToken}`);

      return new Response(
        JSON.stringify({ success: true, invite }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'list') {
      // Get all invites with invited user info
      const { data: invites, error: invitesError } = await supabase
        .from('invites')
        .select(`
          *,
          invited_by_profile:profiles!invites_invited_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (invitesError) {
        throw new Error('Failed to fetch invites');
      }

      // Format the response
      const formattedInvites = invites?.map(invite => ({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        status: invite.status,
        created_at: invite.created_at,
        invited_by_email: invite.invited_by_profile?.full_name || 'Unknown'
      })) || [];

      return new Response(
        JSON.stringify({ invites: formattedInvites }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'revoke') {
      const { inviteId } = requestBody;
      
      if (!inviteId) {
        throw new Error('Invite ID is required');
      }

      const { error: revokeError } = await supabase
        .from('invites')
        .update({ status: 'revoked' })
        .eq('id', inviteId);

      if (revokeError) {
        throw new Error('Failed to revoke invite');
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error: any) {
    console.error('Error in manage-invites function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
