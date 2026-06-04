import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideActivity,
  LucideCalendarDays,
  LucideHeartPulse,
  LucideLayoutDashboard,
  LucideLogOut,
  LucideRuler,
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
    LucideHeartPulse,
    LucideLayoutDashboard,
    LucideLogOut,
    LucideRuler,
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
    { label: 'Medidas', route: '/body-measurements', icon: 'measurements' },
  ];

  constructor(readonly session: SessionService) {}

  ngOnInit() {
    if (!this.session.user()) {
      void this.session.loadContext().catch(() => undefined);
    }
  }
}
