export type RoleCode = 'ADMINISTRADOR' | 'ADMIN' | 'NUTRICIONISTA' | 'SUPER_ADMIN';

export function normalizeRole(roleCode?: string | null): RoleCode | null {
  const normalized = roleCode?.trim().toUpperCase();
  if (
    normalized === 'ADMINISTRADOR' ||
    normalized === 'ADMIN' ||
    normalized === 'NUTRICIONISTA' ||
    normalized === 'SUPER_ADMIN'
  ) {
    return normalized;
  }

  return null;
}

export function homeRouteFor(roleCode?: string | null) {
  return normalizeRole(roleCode) === 'SUPER_ADMIN' ? '/super-admin/tenants' : '/dashboard';
}
