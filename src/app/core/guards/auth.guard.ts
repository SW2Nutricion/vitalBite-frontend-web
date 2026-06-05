import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/session.service';

type RoleCode = 'ADMINISTRADOR' | 'ADMIN' | 'NUTRICIONISTA';
type PermissionCode =
  | 'dashboard:read'
  | 'patients:read'
  | 'appointments:read'
  | 'body-measurements:read'
  | 'payments:read';

const rolePermissions: Record<RoleCode, PermissionCode[]> = {
  ADMINISTRADOR: [
    'dashboard:read',
    'patients:read',
    'appointments:read',
    'body-measurements:read',
    'payments:read',
  ],
  ADMIN: [
    'dashboard:read',
    'patients:read',
    'appointments:read',
    'body-measurements:read',
    'payments:read',
  ],
  NUTRICIONISTA: ['dashboard:read', 'patients:read', 'appointments:read', 'body-measurements:read'],
};

export const authGuard: CanActivateFn = async (_route, state) => {
  const session = inject(SessionService);
  const router = inject(Router);

  if (!session.hasToken()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  const hasContext = await session.ensureContext();
  if (!hasContext) {
    session.clearSession();
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  return true;
};

export const publicOnlyGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);

  if (!session.hasToken()) {
    return true;
  }

  const hasContext = await session.ensureContext();
  if (!hasContext) {
    session.clearSession();
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};

export function roleGuard(allowedRoles: RoleCode[]): CanActivateFn {
  return async () => {
    const session = inject(SessionService);
    const router = inject(Router);

    const hasContext = await session.ensureContext();
    if (!hasContext) {
      session.clearSession();
      return router.createUrlTree(['/login']);
    }

    const roleCode = normalizeRole(session.user()?.roleCode);
    return roleCode && allowedRoles.includes(roleCode) ? true : router.createUrlTree(['/dashboard']);
  };
}

export function permissionGuard(requiredPermissions: PermissionCode[]): CanActivateFn {
  return async () => {
    const session = inject(SessionService);
    const router = inject(Router);

    const hasContext = await session.ensureContext();
    if (!hasContext) {
      session.clearSession();
      return router.createUrlTree(['/login']);
    }

    const roleCode = normalizeRole(session.user()?.roleCode);
    const permissions = roleCode ? rolePermissions[roleCode] : [];
    const canActivate = requiredPermissions.every((permission) => permissions.includes(permission));

    return canActivate ? true : router.createUrlTree(['/dashboard']);
  };
}

function normalizeRole(roleCode?: string | null): RoleCode | null {
  const normalized = roleCode?.trim().toUpperCase();
  if (normalized === 'ADMINISTRADOR' || normalized === 'ADMIN' || normalized === 'NUTRICIONISTA') {
    return normalized;
  }

  return null;
}
