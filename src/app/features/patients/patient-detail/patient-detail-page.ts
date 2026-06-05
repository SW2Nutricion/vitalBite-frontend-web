import { Component, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideActivity,
  LucideArrowLeft,
  LucideCalendarDays,
  LucideFolder,
  LucidePencil,
  LucideRuler,
  LucideUtensils,
} from '@lucide/angular';
import { appointmentStatusLabel, patientStatusLabel } from '../../../core/models/status-labels';
import { Appointment, BodyMeasurement, Patient } from '../../../core/models/vitalbite.models';
import { AppointmentsService } from '../../../core/services/appointments.service';
import { BodyMeasurementsService } from '../../../core/services/body-measurements.service';
import { PatientsService } from '../../../core/services/patients.service';

@Component({
  selector: 'app-patient-detail-page',
  imports: [
    RouterLink,
    LucideActivity,
    LucideArrowLeft,
    LucideCalendarDays,
    LucideFolder,
    LucidePencil,
    LucideRuler,
    LucideUtensils,
  ],
  templateUrl: './patient-detail-page.html',
})
export class PatientDetailPage implements OnInit {
  readonly patient = signal<Patient | null>(null);
  readonly appointments = signal<Appointment[]>([]);
  readonly measurements = signal<BodyMeasurement[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly tabs = ['Resumen', 'Citas', 'Medidas', 'Seguimiento', 'Dietas', 'Documentos'];
  readonly activeTab = signal('Resumen');
  readonly sortedAppointments = computed(() =>
    [...this.appointments()].sort(
      (current, next) =>
        new Date(current.scheduledAt).getTime() - new Date(next.scheduledAt).getTime(),
    ),
  );
  readonly nextAppointment = computed(
    () =>
      this.sortedAppointments().find((appointment) =>
        ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'].includes(appointment.status),
      ) ?? null,
  );
  readonly latestMeasurement = computed(() => this.measurements()[0] ?? null);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly patientsService: PatientsService,
    private readonly appointmentsService: AppointmentsService,
    private readonly measurementsService: BodyMeasurementsService,
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.loading.set(true);
    try {
      const [patient, appointments, measurements] = await Promise.all([
        this.patientsService.byId(id),
        this.appointmentsService.byPatient(id),
        this.measurementsService.byPatient(id).catch(() => []),
      ]);
      this.patient.set(patient);
      this.appointments.set(appointments);
      this.measurements.set(measurements);
    } catch {
      this.error.set('No se pudo cargar el expediente del paciente.');
    } finally {
      this.loading.set(false);
    }
  }

  formatDate(value?: string | null) {
    if (!value) return 'Sin fecha';
    return new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(value),
    );
  }

  compactDate(value?: string | null) {
    if (!value) return 'Sin fecha';
    return new Intl.DateTimeFormat('es-BO', {
      day: '2-digit',
      month: 'short',
    }).format(new Date(value));
  }

  nextAppointmentTitle() {
    const appointment = this.nextAppointment();
    if (!appointment) return 'Sin cita';

    const date = new Date(appointment.scheduledAt);
    const today = new Date(2026, 5, 4);
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const diffDays = Math.round((dateStart.getTime() - todayStart.getTime()) / 86_400_000);
    const time = new Intl.DateTimeFormat('es-BO', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);

    if (diffDays === 0) return `Hoy · ${time}`;
    if (diffDays === 1) return `Mañana · ${time}`;
    return this.formatDate(appointment.scheduledAt);
  }

  birthLabel() {
    const birthDate = this.patient()?.birthDate;
    return birthDate ? this.compactDate(birthDate).replace('.', '') : 'Sin registro';
  }

  genderLabel() {
    const gender = this.patient()?.gender;
    if (gender === 'FEMALE') return 'Femenino';
    if (gender === 'MALE') return 'Masculino';
    if (gender === 'OTHER') return 'Otro';
    return 'No especificado';
  }

  latestWeightLabel() {
    const measurement = this.latestMeasurement();
    return measurement ? `${measurement.weightKg} kg` : 'Sin medidas';
  }

  latestMeasurementDate() {
    return this.latestMeasurement() ? this.compactDate(this.latestMeasurement()!.measuredAt) : 'Pendiente';
  }

  async archive() {
    const patient = this.patient();
    if (!patient) return;

    await this.patientsService.archive(patient.id);
    await this.router.navigateByUrl('/patients');
  }

  appointmentStatusLabel = appointmentStatusLabel;
  patientStatusLabel = patientStatusLabel;
}
