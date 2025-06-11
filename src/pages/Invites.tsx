
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RoleGuard } from '@/components/RoleGuard';
import { Mail, UserPlus, CheckCircle, Clock, XCircle } from 'lucide-react';

interface Invite {
  id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
  invited_by_email?: string;
}

export default function Invites() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'employee' | 'manager' | 'admin'>('employee');
  const [loading, setLoading] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const { toast } = useToast();

  const fetchInvites = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-invites', {
        body: { action: 'list' }
      });

      if (error) throw error;
      setInvites(data?.invites || []);
    } catch (error) {
      console.error('Error fetching invites:', error);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('manage-invites', {
        body: {
          action: 'create',
          email,
          role,
        }
      });

      if (error) throw error;

      toast({
        title: "Invite sent!",
        description: `Invitation sent to ${email}`,
      });

      setEmail('');
      fetchInvites();
    } catch (error: any) {
      toast({
        title: "Failed to send invite",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase.functions.invoke('manage-invites', {
        body: {
          action: 'revoke',
          inviteId,
        }
      });

      if (error) throw error;

      toast({
        title: "Invite revoked",
        description: "The invitation has been revoked",
      });

      fetchInvites();
    } catch (error: any) {
      toast({
        title: "Failed to revoke invite",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <RoleGuard requiredRole="admin">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-6xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Team Invitations</h1>
            <p className="text-gray-600">Invite new team members to join your organization.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-blue-600" />
                  Send Invitation
                </CardTitle>
                <CardDescription>
                  Invite new team members by email address
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendInvite} className="space-y-4">
                  <div>
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-green-600" />
                  Pending Invitations
                </CardTitle>
                <CardDescription>
                  Manage outstanding invitations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {invites.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Mail className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No invitations sent yet</p>
                    </div>
                  ) : (
                    invites.map((invite) => (
                      <div key={invite.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{invite.email}</span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              invite.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              invite.status === 'accepted' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {invite.role}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {invite.status === 'pending' && <Clock className="h-3 w-3 text-yellow-600" />}
                            {invite.status === 'accepted' && <CheckCircle className="h-3 w-3 text-green-600" />}
                            {invite.status === 'expired' && <XCircle className="h-3 w-3 text-red-600" />}
                            <span className="text-xs text-gray-500 capitalize">{invite.status}</span>
                          </div>
                        </div>
                        {invite.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevokeInvite(invite.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Revoke
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
