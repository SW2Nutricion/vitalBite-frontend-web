import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideActivity,
  LucideAlertTriangle,
  LucideCalendarDays,
  LucideDownload,
  LucideFilter,
  LucidePlus,
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
  imports: [
    RouterLink,
    LucideActivity,
    LucideAlertTriangle,
    LucideCalendarDays,
    LucideDownload,
    LucideFilter,
    LucidePlus,
    LucideRuler,
    LucideUsers,
  ],
  templateUrl: './dashboard-page.html',
})
export class DashboardPage implements OnInit {
  readonly loading = signal(true);
  readonly error = signal('');
  readonly patients = signal<Patient[]>([]);
  readonly appointments = signal<Appointment[]>([]);
  readonly measurements = signal<BodyMeasurement[]>([]);

  private readonly scheduledStatuses = ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'];

  readonly activePatients = computed(
    () => this.patients().filter((patient) => patient.status === 'ACTIVE').length,
  );
  readonly pendingAppointments = computed(
    () =>
      this.appointments().filter((appointment) =>
        this.scheduledStatuses.includes(appointment.status),
      ).length,
  );
  readonly sortedMeasurements = computed(() =>
    [...this.measurements()].sort(
      (current, next) =>
        new Date(next.measuredAt).getTime() - new Date(current.measuredAt).getTime(),
    ),
  );
  readonly latestMeasurement = computed<BodyMeasurement | null>(
    () => this.sortedMeasurements()[0] ?? null,
  );
  readonly previousMeasurement = computed<BodyMeasurement | null>(
    () => this.sortedMeasurements()[1] ?? null,
  );
  readonly upcomingAppointments = computed(() =>
    [...this.appointments()]
      .filter((appointment) => this.scheduledStatuses.includes(appointment.status))
      .sort(
        (current, next) =>
          new Date(current.scheduledAt).getTime() - new Date(next.scheduledAt).getTime(),
      ),
  );
  readonly evolutionBars = computed(() => {
    const measurements = this.sortedMeasurements().slice(0, 8).reverse();
    const weights = measurements.map((measurement) => measurement.weightKg ?? 0);
    const minWeight = weights.length ? Math.min(...weights) : 0;
    const maxWeight = weights.length ? Math.max(...weights) : 0;
    const range = Math.max(maxWeight - minWeight, 1);

    return measurements.map((measurement, index) => ({
      id: measurement.id,
      label: this.formatDate(measurement.measuredAt),
      value: `${this.formatNumber(measurement.weightKg)} kg`,
      height: measurements.length === 1 ? 68 : 36 + ((measurement.weightKg - minWeight) / range) * 56,
      featured: index === measurements.length - 1,
    }));
  });
  readonly patientRows = computed(() =>
    this.patients()
      .filter((patient) => patient.status === 'ACTIVE')
      .slice(0, 5)
      .map((patient) => ({
        id: patient.id,
        name: patient.fullName,
        goal: patient.nutritionGoal || 'Sin objetivo registrado',
        risk: 'N/D',
        adherence: 'N/D',
        lastAppointment: this.lastAppointmentLabel(patient.id),
      })),
  );
  readonly hasMeasurements = computed(() => this.measurements().length > 0);
  readonly measurementsEntryRoute = computed(() => {
    const patientId = this.latestMeasurement()?.patientId ?? this.patients()[0]?.id;
    return patientId ? ['/patients', patientId, 'measurements'] : ['/patients'];
  });
  readonly waistVariation = computed(() => {
    const latest = this.latestMeasurement();
    const previous = this.previousMeasurement();
    if (!latest?.waistCm || !previous?.waistCm) return 'N/D';
    const variation = latest.waistCm - previous.waistCm;
    return `${variation > 0 ? '+' : ''}${this.formatNumber(variation)} cm`;
  });

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

  formatNumber(value?: number | null) {
    if (value === null || value === undefined) return 'N/D';
    return new Intl.NumberFormat('es-BO', { maximumFractionDigits: 1 }).format(value);
  }

  lastAppointmentLabel(patientId: string) {
    const appointment = [...this.appointments()]
      .filter((item) => item.patientId === patientId)
      .sort(
        (current, next) =>
          new Date(next.scheduledAt).getTime() - new Date(current.scheduledAt).getTime(),
      )[0];
    return appointment ? this.formatDate(appointment.scheduledAt) : 'Sin citas';
  }

  statusLabel = appointmentStatusLabel;
}
