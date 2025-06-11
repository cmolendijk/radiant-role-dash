
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { LogOut, Users, UserCheck, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Navbar = () => {
  const { user, signOut } = useAuth();
  const { role } = useUserRole();

  if (!user) return null;

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-8">
          <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            TaskFlow
          </Link>
          
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/dashboard" className="text-gray-700 hover:text-blue-600 transition-colors">
              Dashboard
            </Link>
            <Link to="/tasks" className="text-gray-700 hover:text-blue-600 transition-colors">
              Tasks
            </Link>
            {(role === 'admin' || role === 'owner') && (
              <>
                <Link to="/teams" className="text-gray-700 hover:text-blue-600 transition-colors">
                  Teams
                </Link>
                <Link to="/users" className="text-gray-700 hover:text-blue-600 transition-colors">
                  Users
                </Link>
                <Link to="/invites" className="text-gray-700 hover:text-blue-600 transition-colors">
                  Invites
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2">
            <div className="text-sm text-gray-600">{user.email}</div>
            {role && (
              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                role === 'owner' ? 'bg-purple-100 text-purple-800' :
                role === 'admin' ? 'bg-blue-100 text-blue-800' :
                role === 'manager' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {role}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-gray-600 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
};
