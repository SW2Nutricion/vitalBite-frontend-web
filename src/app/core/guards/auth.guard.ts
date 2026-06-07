import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/session.service';
import { RoleCode, homeRouteFor, normalizeRole } from './role-routing';

type PermissionCode =
  | 'dashboard:read'
  | 'patients:read'
  | 'appointments:read'
  | 'body-measurements:read'
  | 'diets:read'
  | 'payments:read'
  | 'users:read'
  | 'users:write'
  | 'audit-log:read'
  | 'super-admin:read';

const rolePermissions: Record<RoleCode, PermissionCode[]> = {
  ADMINISTRADOR: [
    'dashboard:read',
    'patients:read',
    'appointments:read',
    'body-measurements:read',
    'diets:read',
    'payments:read',
    'users:read',
    'users:write',
    'audit-log:read',
  ],
  ADMIN: [
    'dashboard:read',
    'patients:read',
    'appointments:read',
    'body-measurements:read',
    'diets:read',
    'payments:read',
    'users:read',
    'users:write',
    'audit-log:read',
  ],
  NUTRICIONISTA: [
    'dashboard:read',
    'patients:read',
    'appointments:read',
    'body-measurements:read',
    'diets:read',
  ],
  SUPER_ADMIN: ['super-admin:read', 'audit-log:read'],
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

  const subscriptionState = await session.ensureSubscriptionState();
  if (
    session.user()?.roleCode?.trim().toUpperCase() !== 'SUPER_ADMIN' &&
    subscriptionState !== 'active'
  ) {
    return router.createUrlTree(['/activate-plan']);
  }

  return router.createUrlTree([homeRouteFor(session.user()?.roleCode)]);
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
    return roleCode && allowedRoles.includes(roleCode)
      ? true
      : router.createUrlTree([homeRouteFor(session.user()?.roleCode)]);
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

    return canActivate ? true : router.createUrlTree([homeRouteFor(session.user()?.roleCode)]);
  };
}

export function subscriptionGuard(
  mode: 'active' | 'inactive',
): CanActivateFn {
  return async () => {
    const session = inject(SessionService);
    const router = inject(Router);

    const hasContext = await session.ensureContext();
    if (!hasContext) {
      session.clearSession();
      return router.createUrlTree(['/login']);
    }

    if (normalizeRole(session.user()?.roleCode) === 'SUPER_ADMIN') {
      return mode === 'active'
        ? true
        : router.createUrlTree([homeRouteFor(session.user()?.roleCode)]);
    }

    const subscriptionState = await session.refreshSubscriptionState();

    if (mode === 'inactive') {
      return subscriptionState === 'active'
        ? router.createUrlTree([homeRouteFor(session.user()?.roleCode)])
        : true;
    }

    return subscriptionState === 'active'
      ? true
      : router.createUrlTree(['/activate-plan']);
  };
}
