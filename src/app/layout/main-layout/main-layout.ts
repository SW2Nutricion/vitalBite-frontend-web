import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideActivity,
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

@Component({
  selector: 'app-main-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LucideActivity,
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
    { label: 'Inicio', route: '/dashboard', icon: 'dashboard' },
    { label: 'Pacientes', route: '/patients', icon: 'patients' },
    { label: 'Citas', route: '/appointments', icon: 'appointments' },
    { label: 'Dietas', route: null, icon: 'diets' },
    { label: 'Medidas', route: '/body-measurements', icon: 'measurements' },
    { label: 'Pagos', route: '/payments-subscriptions', icon: 'payments', adminOnly: true },
    { label: 'Reportes', route: null, icon: 'reports' },
    { label: 'Configuracion', route: null, icon: 'settings' },
  ];

  constructor(readonly session: SessionService) {}

  ngOnInit() {
    if (!this.session.user()) {
      void this.session.loadContext().catch(() => undefined);
    }
  }

  visibleNavItems() {
    return this.navItems.filter((item) => !item.adminOnly || this.isAdmin());
  }

  roleLabel() {
    return this.isAdmin() ? 'Administrador' : 'Nutricionista';
  }

  private isAdmin() {
    const roleCode = this.session.user()?.roleCode?.trim().toUpperCase();
    return roleCode === 'ADMINISTRADOR' || roleCode === 'ADMIN';
  }
}
