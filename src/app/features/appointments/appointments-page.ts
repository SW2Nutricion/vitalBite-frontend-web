import { Component, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppointmentsCalendarComponent } from './appointments-calendar/appointments-calendar.component';
import { PendingAppointments } from './pending-appointments/pending-appointments';
import { ScheduleConfig } from './schedule-config/schedule-config';
import { LucidePlus } from '@lucide/angular';

@Component({
  selector: 'app-appointments-page',
  imports: [CommonModule, AppointmentsCalendarComponent, PendingAppointments, ScheduleConfig, LucidePlus],
  template: `
    <div class="h-full flex flex-col p-6 max-w-7xl mx-auto">
      <header class="page-header">
        <div>
          <h1>Agenda Nutricional</h1>
          <p class="muted">Gestiona tus consultas, horarios y pacientes pendientes.</p>
        </div>
        <div class="appointments-hero-actions">
          <button (click)="openCreateModal()" class="btn">
            <svg lucidePlus size="18"></svg>
            Nueva cita
          </button>
        </div>
      </header>

      <div class="appointments-view-toggle mb-8">
        <button
          (click)="activeTab.set('calendar')"
          [class.active]="activeTab() === 'calendar'"
          class="appointments-view-pill"
        >
          Calendario
        </button>
        
        <button
          (click)="activeTab.set('pending')"
          [class.active]="activeTab() === 'pending'"
          class="appointments-view-pill"
        >
          Reservas Pendientes
        </button>
        
        <button
          (click)="activeTab.set('schedule')"
          [class.active]="activeTab() === 'schedule'"
          class="appointments-view-pill"
        >
          Mis Horarios
        </button>
      </div>

      <div class="flex-1 overflow-hidden">
        @if (activeTab() === 'calendar') {
          <app-appointments-calendar></app-appointments-calendar>
        }
        @if (activeTab() === 'pending') {
          <app-pending-appointments></app-pending-appointments>
        }
        @if (activeTab() === 'schedule') {
          <app-schedule-config></app-schedule-config>
        }
      </div>
    </div>
  `,
})
export class AppointmentsPage {
  activeTab = signal<'calendar' | 'pending' | 'schedule'>('calendar');

  @ViewChild(AppointmentsCalendarComponent) calendar?: AppointmentsCalendarComponent;

  openCreateModal() {
    if (this.activeTab() !== 'calendar') {
      this.activeTab.set('calendar');
      setTimeout(() => this.calendar?.openCreate(), 50);
    } else {
      this.calendar?.openCreate();
    }
  }
}

