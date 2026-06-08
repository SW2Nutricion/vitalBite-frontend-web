import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphqlService } from '../../../core/graphql/graphql.service';
import { LucideCheckCircle, LucideXCircle } from '@lucide/angular';

@Component({
  selector: 'app-pending-appointments',
  imports: [CommonModule, LucideCheckCircle, LucideXCircle],
  template: `
    <div class="p-4 max-w-6xl mx-auto">
      <div class="mb-6">
        <h2 class="text-xl font-bold text-gray-900 dark:text-white">Reservas Pendientes (WhatsApp)</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">Estas citas fueron solicitadas por tus pacientes y están esperando tu confirmación.</p>
      </div>

      @if (loading()) {
        <div class="flex justify-center p-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        </div>
      } @else if (appointments().length === 0) {
        <div class="text-center p-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
          <p class="text-gray-500 dark:text-gray-400">No hay reservas pendientes de aprobación.</p>
        </div>
      } @else {
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          @for (appt of appointments(); track appt.id) {
            <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col">
              <div class="flex justify-between items-start mb-4">
                <div>
                  <h3 class="font-semibold text-gray-900 dark:text-white">{{ appt.patientFullName }}</h3>
                  <p class="text-sm text-gray-500 dark:text-gray-400">{{ appt.patient?.phone }}</p>
                </div>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500">
                  Pendiente
                </span>
              </div>
              
              <div class="mb-6">
                <p class="text-sm text-gray-600 dark:text-gray-300">
                  <span class="font-medium">Fecha:</span> {{ appt.scheduledAt | date:'longDate' }}
                </p>
                <p class="text-sm text-gray-600 dark:text-gray-300">
                  <span class="font-medium">Hora:</span> {{ appt.scheduledAt | date:'shortTime' }}
                </p>
              </div>

              <div class="mt-auto flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  (click)="approve(appt.id)"
                  [disabled]="actionLoading() === appt.id"
                  class="flex-1 inline-flex justify-center items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <svg lucideCheckCircle size="16"></svg>
                  Aprobar
                </button>
                <button
                  (click)="reject(appt.id)"
                  [disabled]="actionLoading() === appt.id"
                  class="flex-1 inline-flex justify-center items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-500 rounded-lg disabled:opacity-50"
                >
                  <svg lucideXCircle size="16"></svg>
                  Rechazar
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class PendingAppointments implements OnInit {
  private graphql = inject(GraphqlService);

  readonly LucideCheckCircle = LucideCheckCircle;
  readonly LucideXCircle = LucideXCircle;

  loading = signal(false);
  actionLoading = signal<string | null>(null);
  appointments = signal<any[]>([]);

  ngOnInit() {
    this.loadAppointments();
  }

  async loadAppointments() {
    this.loading.set(true);
    try {
      const response = await this.graphql.query<{ appointments: any[] }>(`
        query GetPendingAppointments {
          appointments(filter: { status: "PENDING" }) {
            id
            patientFullName
            scheduledAt
            patient {
              phone
            }
          }
        }
      `);
      this.appointments.set(response.appointments || []);
    } catch (e) {
      console.error(e);
    } finally {
      this.loading.set(false);
    }
  }

  async approve(id: string) {
    this.actionLoading.set(id);
    try {
      await this.graphql.mutate(`
        mutation ConfirmAppt($id: ID!) {
          confirmAppointment(id: $id) {
            id
            status
          }
        }
      `, { id });
      
      this.appointments.update(appts => appts.filter(a => a.id !== id));
    } catch (e) {
      console.error(e);
      alert('Error aprobando la cita');
    } finally {
      this.actionLoading.set(null);
    }
  }

  async reject(id: string) {
    this.actionLoading.set(id);
    try {
      await this.graphql.mutate(`
        mutation CancelAppt($id: ID!, $input: CancelAppointmentInput!) {
          cancelAppointment(id: $id, input: $input) {
            id
            status
          }
        }
      `, { id, input: { reason: 'No disponibilidad de horario por el momento.' } });
      
      this.appointments.update(appts => appts.filter(a => a.id !== id));
    } catch (e) {
      console.error(e);
      alert('Error rechazando la cita');
    } finally {
      this.actionLoading.set(null);
    }
  }
}

