import { UserRole } from '../types';
import { getStoredRolePermissions, DEFAULT_ROLE_PERMISSIONS } from '../data/permissionsData';

/**
 * Checks whether a given role has permission to execute an action or view a section.
 */
export function canAccess(role: UserRole, permissionCode: string): boolean {
  if (role === 'SUPER_ADMIN') return true;
  
  try {
    const config = getStoredRolePermissions();
    if (config[role] && typeof config[role][permissionCode] === 'boolean') {
      return config[role][permissionCode];
    }
  } catch {
    // fallback to defaults
  }

  const defaultForRole = DEFAULT_ROLE_PERMISSIONS[role];
  if (defaultForRole && typeof defaultForRole[permissionCode] === 'boolean') {
    return defaultForRole[permissionCode];
  }

  return false;
}

/**
 * Checks if role can access any administrative dashboard features
 */
export function canAccessAdmin(role: UserRole): boolean {
  return canAccess(role, 'admin.view_dashboard') || role === 'SUPER_ADMIN' || role === 'ADMIN';
}

/**
 * Checks if role can modify members
 */
export function canEditMembers(role: UserRole): boolean {
  return canAccess(role, 'members.edit_all');
}

/**
 * Checks if role can delete members
 */
export function canDeleteMembers(role: UserRole): boolean {
  return canAccess(role, 'members.delete');
}

/**
 * Checks if role can configure roles and security
 */
export function canManageSecurity(role: UserRole): boolean {
  return canAccess(role, 'admin.manage_roles') || role === 'SUPER_ADMIN';
}
