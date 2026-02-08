// Role-based access control utilities
// Use these functions to check user permissions throughout your app

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  CASHIER: 'cashier',
  VIEWER: 'viewer',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Check if user has required role
export function hasRole(userRole: Role, requiredRole: Role): boolean {
  const roleHierarchy = {
    [ROLES.ADMIN]: 4,
    [ROLES.MANAGER]: 3,
    [ROLES.CASHIER]: 2,
    [ROLES.VIEWER]: 1,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

// Check if user can access a specific route
export function canAccessRoute(userRole: Role, route: string): boolean {
  const routePermissions: Record<string, Role> = {
    '/dashboard': ROLES.VIEWER,
    '/sales': ROLES.CASHIER,
    '/expenses': ROLES.MANAGER,
    '/cash': ROLES.MANAGER,
    '/settings': ROLES.ADMIN,
  };

  const requiredRole = routePermissions[route];
  if (!requiredRole) return true; // Public route
  
  return hasRole(userRole, requiredRole);
}

// Check authentication and authorization
export function checkAuth(userRole: Role | null, pathname: string): boolean {
  // Public routes
  const publicRoutes = ['/login', '/'];
  if (publicRoutes.includes(pathname)) return true;

  // User must be logged in
  if (!userRole) return false;

  // Check role-based access
  return canAccessRoute(userRole, pathname);
}
