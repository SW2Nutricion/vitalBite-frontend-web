import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideCalendarDays,
  LucideClipboardList,
  LucideRuler,
  LucideUsers,
} from '@lucide/angular';
import { Appointment, BodyMeasurement, Patient } from '../../core/models/vitalbite.models';
import { appointmentStatusLabel } from '../../core/models/status-labels';
import { AppointmentsService } from '../../core/services/appointments.service';
import { BodyMeasurementsService } from '../../core/services/body-measurements.service';
import { PatientsService } from '../../core/services/patients.service';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, LucideCalendarDays, LucideClipboardList, LucideRuler, LucideUsers],
  templateUrl: './dashboard-page.html',
})
export class DashboardPage implements OnInit {
  readonly loading = signal(true);
  readonly error = signal('');
  readonly patients = signal<Patient[]>([]);
  readonly appointments = signal<Appointment[]>([]);
  readonly measurements = signal<BodyMeasurement[]>([]);

  readonly activePatients = computed(
    () => this.patients().filter((patient) => patient.status === 'ACTIVE').length,
  );
  readonly pendingAppointments = computed(
    () =>
      this.appointments().filter((appointment) =>
        ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'].includes(appointment.status),
      ).length,
  );
  readonly completedAppointments = computed(
    () => this.appointments().filter((appointment) => appointment.status === 'COMPLETED').length,
  );
  readonly latestMeasurement = computed<BodyMeasurement | null>(() => this.measurements()[0] ?? null);

  constructor(
    private readonly patientsService: PatientsService,
    private readonly appointmentsService: AppointmentsService,
    private readonly measurementsService: BodyMeasurementsService,
  ) {}

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const patients = await this.patientsService.list();
      const appointments = await this.appointmentsService.calendar();
      let measurements: BodyMeasurement[] = [];

      for (const patient of patients) {
        measurements = await this.measurementsService.byPatient(patient.id);
        if (measurements.length > 0) break;
      }

      this.patients.set(patients);
      this.appointments.set(appointments);
      this.measurements.set(measurements);
    } catch {
      this.error.set('No se pudo cargar el resumen operativo.');
    } finally {
      this.loading.set(false);
    }
  }

  formatDate(value?: string | null) {
    if (!value) return 'Sin fecha';
    return new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short' }).format(new Date(value));
  }

  statusLabel = appointmentStatusLabel;
}
