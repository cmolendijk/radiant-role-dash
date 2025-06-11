
import { useUserRole, UserRole } from '@/hooks/useUserRole';

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRole: UserRole;
  fallback?: React.ReactNode;
}

export const RoleGuard = ({ children, requiredRole, fallback }: RoleGuardProps) => {
  const { hasRole, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasRole(requiredRole)) {
    return fallback ? <>{fallback}</> : (
      <div className="text-center p-8">
        <p className="text-muted-foreground">You don't have permission to access this feature.</p>
      </div>
    );
  }

  return <>{children}</>;
};
