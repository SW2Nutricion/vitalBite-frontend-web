import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppointmentsCalendarComponent } from './appointments-calendar/appointments-calendar.component';
import { PendingAppointments } from './pending-appointments/pending-appointments';
import { ScheduleConfig } from './schedule-config/schedule-config';

@Component({
  selector: 'app-appointments-page',
  imports: [CommonModule, AppointmentsCalendarComponent, PendingAppointments, ScheduleConfig],
  template: `
    <div class="h-full flex flex-col p-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Citas y Horarios</h1>
      </div>

      <div class="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav class="-mb-px flex space-x-8">
          <button
            (click)="activeTab.set('calendar')"
            [class.border-brand-500]="activeTab() === 'calendar'"
            [class.text-brand-600]="activeTab() === 'calendar'"
            [class.border-transparent]="activeTab() !== 'calendar'"
            [class.text-gray-500]="activeTab() !== 'calendar'"
            class="whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm hover:text-gray-700 dark:hover:text-gray-300"
          >
            Calendario
          </button>
          
          <button
            (click)="activeTab.set('pending')"
            [class.border-brand-500]="activeTab() === 'pending'"
            [class.text-brand-600]="activeTab() === 'pending'"
            [class.border-transparent]="activeTab() !== 'pending'"
            [class.text-gray-500]="activeTab() !== 'pending'"
            class="whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm hover:text-gray-700 dark:hover:text-gray-300"
          >
            Reservas Pendientes
          </button>
          
          <button
            (click)="activeTab.set('schedule')"
            [class.border-brand-500]="activeTab() === 'schedule'"
            [class.text-brand-600]="activeTab() === 'schedule'"
            [class.border-transparent]="activeTab() !== 'schedule'"
            [class.text-gray-500]="activeTab() !== 'schedule'"
            class="whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm hover:text-gray-700 dark:hover:text-gray-300"
          >
            Mis Horarios
          </button>
        </nav>
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
}

