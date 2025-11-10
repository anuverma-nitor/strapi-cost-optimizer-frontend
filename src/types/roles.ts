/**
 * User Role Enum
 * Defines the available user roles in the system
 * Must match the backend enum values
 */
export enum UserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  AUTHOR = 'author',
  VIEWER = 'viewer',
}

/**
 * Array of all valid role values
 */
export const USER_ROLES = Object.values(UserRole);

/**
 * Get role display name
 */
export function getRoleDisplayName(role: string | undefined): string {
  const roleMap: Record<string, string> = {
    [UserRole.ADMIN]: 'Administrator',
    [UserRole.EDITOR]: 'Editor',
    [UserRole.AUTHOR]: 'Author',
    [UserRole.VIEWER]: 'Viewer',
  };
  return roleMap[role?.toLowerCase() || ''] || role || 'Viewer';
}

/**
 * Get role badge color class
 */
export function getRoleBadgeColor(role: string | undefined): string {
  const roleLower = role?.toLowerCase() || '';
  if (roleLower === UserRole.ADMIN) {
    return 'bg-red-100 text-red-800';
  } else if (roleLower === UserRole.EDITOR) {
    return 'bg-blue-100 text-blue-800';
  } else if (roleLower === UserRole.AUTHOR) {
    return 'bg-green-100 text-green-800';
  } else {
    return 'bg-gray-100 text-gray-800';
  }
}

