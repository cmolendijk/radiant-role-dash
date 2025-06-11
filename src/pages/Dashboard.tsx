
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  Users, 
  CheckSquare, 
  Calendar, 
  TrendingUp, 
  UserPlus,
  Settings
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const { role } = useUserRole();

  const quickActions = [
    { 
      title: 'View Tasks', 
      icon: CheckSquare, 
      href: '/tasks', 
      color: 'from-blue-500 to-blue-600',
      description: 'Manage your assigned tasks'
    },
    ...(role === 'admin' || role === 'owner' ? [
      { 
        title: 'Manage Teams', 
        icon: Users, 
        href: '/teams', 
        color: 'from-green-500 to-green-600',
        description: 'Create and manage teams'
      },
      { 
        title: 'Invite Users', 
        icon: UserPlus, 
        href: '/invites', 
        color: 'from-purple-500 to-purple-600',
        description: 'Send invitations to new team members'
      },
      { 
        title: 'User Management', 
        icon: Settings, 
        href: '/users', 
        color: 'from-orange-500 to-orange-600',
        description: 'Manage user roles and permissions'
      }
    ] : [])
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.user_metadata?.full_name || user?.email}!
          </h1>
          <p className="text-gray-600">Here's what's happening with your team today.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.title} to={action.href}>
                <Card className="hover:shadow-lg transition-all duration-200 border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${action.color} flex items-center justify-center mb-3`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Welcome to TaskFlow!</span>
                  <span className="text-xs text-gray-400">Just now</span>
                </div>
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Your recent activities will appear here</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-green-600" />
                Task Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-green-800">Pending Tasks</span>
                  <span className="text-2xl font-bold text-green-600">0</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-blue-800">In Progress</span>
                  <span className="text-2xl font-bold text-blue-600">0</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm font-medium text-purple-800">Completed</span>
                  <span className="text-2xl font-bold text-purple-600">0</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
