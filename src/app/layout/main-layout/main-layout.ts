import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideActivity,
  LucideBuilding2,
  LucideCalendarDays,
  LucideCreditCard,
  LucideFolder,
  LucideHeartPulse,
  LucideLayoutDashboard,
  LucideLogOut,
  LucideRuler,
  LucideSettings,
  LucideUtensils,
  LucideUsers,
} from '@lucide/angular';
import { SessionService } from '../../core/services/session.service';
import { homeRouteFor } from '../../core/guards/role-routing';

@Component({
  selector: 'app-main-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LucideActivity,
    LucideBuilding2,
    LucideCalendarDays,
    LucideCreditCard,
    LucideFolder,
    LucideHeartPulse,
    LucideLayoutDashboard,
    LucideLogOut,
    LucideRuler,
    LucideSettings,
    LucideUtensils,
    LucideUsers,
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout implements OnInit {
  readonly navItems = [
    { label: 'Tenants', route: '/super-admin/tenants', icon: 'tenants', superAdminOnly: true },
    { label: 'Auditoria', route: '/audit-log', icon: 'audit', auditOnly: true },
    { label: 'Inicio', route: '/dashboard', icon: 'dashboard' },
    { label: 'Pacientes', route: '/patients', icon: 'patients' },
    { label: 'Usuarios', route: '/users', icon: 'users', adminOnly: true },
    { label: 'Citas', route: '/appointments', icon: 'appointments' },
    { label: 'Dietas', route: null, icon: 'diets' },
    { label: 'Medidas', route: '/body-measurements', icon: 'measurements' },
    { label: 'Pagos', route: '/payments-subscriptions', icon: 'payments', adminOnly: true },
    { label: 'Reportes', route: null, icon: 'reports' },
    { label: 'Configuracion', route: null, icon: 'settings' },
  ];

  constructor(readonly session: SessionService) {}

  homeRoute() {
    return homeRouteFor(this.session.user()?.roleCode);
  }

  ngOnInit() {
    if (!this.session.user()) {
      void this.session.loadContext().catch(() => undefined);
    }
  }

  visibleNavItems() {
    if (this.isSuperAdmin()) {
      return this.navItems.filter((item) => item.superAdminOnly || item.auditOnly);
    }

    return this.navItems.filter(
      (item) =>
        !item.superAdminOnly &&
        (!item.adminOnly || this.isAdmin()) &&
        (!item.auditOnly || this.isAdmin()),
    );
  }

  roleLabel() {
    if (this.isSuperAdmin()) {
      return 'Super Admin';
    }

    return this.isAdmin() ? 'Administrador' : 'Nutricionista';
  }

  private isSuperAdmin() {
    const roleCode = this.session.user()?.roleCode?.trim().toUpperCase();
    return roleCode === 'SUPER_ADMIN';
  }

  private isAdmin() {
    const roleCode = this.session.user()?.roleCode?.trim().toUpperCase();
    return roleCode === 'ADMINISTRADOR' || roleCode === 'ADMIN';
  }
}
