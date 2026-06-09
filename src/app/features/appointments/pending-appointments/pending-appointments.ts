import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppointmentsService } from '../../../core/services/appointments.service';
import { ToastService } from '../../../core/services/toast.service';
import { Appointment } from '../../../core/models/vitalbite.models';
import { LucideCheckCircle, LucideXCircle, LucideCalendar, LucideClock } from '@lucide/angular';

@Component({
  selector: 'app-pending-appointments',
  imports: [CommonModule, LucideCheckCircle, LucideXCircle, LucideCalendar, LucideClock],
  template: `
    <div class="pending-container">
      <div class="pending-header">
        <h2>Reservas Pendientes (WhatsApp)</h2>
        <p>Estas citas fueron solicitadas por tus pacientes y están esperando tu confirmación.</p>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
        </div>
      } @else if (appointments().length === 0) {
        <div class="empty-state">
          <p>No hay reservas pendientes de aprobación.</p>
        </div>
      } @else {
        <div class="pending-grid">
          @for (appt of appointments(); track appt.id) {
            <div class="pending-card">
              <div class="pending-card-top">
                <h3>{{ appt.patientFullName }}</h3>
                <span class="badge-pending">Pendiente</span>
              </div>
              
              <div class="pending-card-body">
                <div class="info-row">
                  <svg lucideCalendar size="16"></svg>
                  <span><strong>Fecha:</strong> {{ appt.scheduledAt | date:'longDate' }}</span>
                </div>
                <div class="info-row">
                  <svg lucideClock size="16"></svg>
                  <span><strong>Hora:</strong> {{ appt.scheduledAt | date:'shortTime' }}</span>
                </div>
              </div>

              <div class="pending-card-actions">
                <button
                  class="btn-approve"
                  (click)="approve(appt.id)"
                  [disabled]="actionLoading() === appt.id"
                >
                  <svg lucideCheckCircle size="18"></svg>
                  Aprobar
                </button>
                <button
                  class="btn-reject"
                  (click)="reject(appt.id)"
                  [disabled]="actionLoading() === appt.id"
                >
                  <svg lucideXCircle size="18"></svg>
                  Rechazar
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .pending-container { max-width: 1100px; padding: 24px 0; margin: 0 auto; }
    .pending-header { margin-bottom: 32px; }
    .pending-header h2 { font-size: 24px; font-weight: 800; color: var(--green-950); margin: 0 0 4px; }
    .pending-header p { margin: 0; color: var(--muted); font-size: 14px; }
    
    .loading-state { display: flex; justify-content: center; padding: 40px; }
    .spinner { width: 32px; height: 32px; border: 3px solid var(--line); border-top-color: var(--green-700); border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    
    .empty-state { text-align: center; padding: 48px 24px; background: var(--panel); border: 1px solid var(--line); border-radius: 16px; color: var(--muted); }
    
    .pending-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
    
    .pending-card { background: var(--panel); border: 1px solid var(--line); border-radius: 20px; padding: 24px; display: flex; flex-direction: column; box-shadow: 0 4px 12px rgba(22, 63, 42, 0.03); transition: transform 0.2s, box-shadow 0.2s; }
    .pending-card:hover { transform: translateY(-4px); box-shadow: var(--shadow); }
    
    .pending-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; gap: 12px; }
    .pending-card-top h3 { font-size: 18px; font-weight: 800; margin: 0; color: var(--green-950); line-height: 1.2; }
    
    .badge-pending { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; background: #fff3cd; color: #856404; border: 1px solid #ffeeba; white-space: nowrap; }
    
    .pending-card-body { margin-bottom: 24px; display: flex; flex-direction: column; gap: 12px; }
    .info-row { display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--muted); }
    .info-row strong { color: var(--text); font-weight: 700; }
    .info-row svg { color: #a0aec0; }
    
    .pending-card-actions { margin-top: auto; padding-top: 20px; border-top: 1px solid var(--line); display: flex; gap: 12px; }
    
    .btn-approve { flex: 1; display: inline-flex; justify-content: center; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 12px; font-size: 14px; font-weight: 700; border: none; background: var(--green-700); color: white; cursor: pointer; transition: background 0.2s; }
    .btn-approve:hover:not(:disabled) { background: var(--green-900); }
    .btn-approve:disabled { opacity: 0.6; cursor: not-allowed; }
    
    .btn-reject { flex: 1; display: inline-flex; justify-content: center; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 12px; font-size: 14px; font-weight: 700; border: none; background: #f8f9fa; color: var(--muted); cursor: pointer; transition: all 0.2s; }
    .btn-reject:hover:not(:disabled) { background: #ffebee; color: var(--danger); }
    .btn-reject:disabled { opacity: 0.6; cursor: not-allowed; }
  `]
})
export class PendingAppointments implements OnInit {
  private appointmentsService = inject(AppointmentsService);
  private toast = inject(ToastService);

  readonly LucideCheckCircle = LucideCheckCircle;
  readonly LucideXCircle = LucideXCircle;
  readonly LucideCalendar = LucideCalendar;
  readonly LucideClock = LucideClock;

  loading = signal(false);
  actionLoading = signal<string | null>(null);
  appointments = signal<Appointment[]>([]);

  ngOnInit() {
    this.loadAppointments();
  }

  async loadAppointments() {
    this.loading.set(true);
    try {
      const appointments = await this.appointmentsService.pending();
      this.appointments.set(appointments || []);
    } catch (e) {
      console.error(e);
      this.toast.error('Error cargando las citas pendientes');
    } finally {
      this.loading.set(false);
    }
  }

  async approve(id: string) {
    this.actionLoading.set(id);
    try {
      await this.appointmentsService.confirm(id);
      this.appointments.update(appts => appts.filter(a => a.id !== id));
      this.toast.success('Cita confirmada correctamente');
    } catch (e) {
      console.error(e);
      this.toast.error('Error aprobando la cita');
    } finally {
      this.actionLoading.set(null);
    }
  }

  async reject(id: string) {
    this.actionLoading.set(id);
    try {
      await this.appointmentsService.cancel(id, 'No disponibilidad de horario por el momento.');
      this.appointments.update(appts => appts.filter(a => a.id !== id));
      this.toast.success('Cita rechazada');
    } catch (e) {
      console.error(e);
      this.toast.error('Error rechazando la cita');
    } finally {
      this.actionLoading.set(null);
    }
  }
}

