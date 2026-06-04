import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideCalendarDays, LucideRuler } from '@lucide/angular';
import { appointmentStatusLabel, patientStatusLabel } from '../../../core/models/status-labels';
import { Appointment, BodyMeasurement, Patient } from '../../../core/models/vitalbite.models';
import { AppointmentsService } from '../../../core/services/appointments.service';
import { BodyMeasurementsService } from '../../../core/services/body-measurements.service';
import { PatientsService } from '../../../core/services/patients.service';

@Component({
  selector: 'app-patient-detail-page',
  imports: [RouterLink, LucideArrowLeft, LucideCalendarDays, LucideRuler],
  templateUrl: './patient-detail-page.html',
})
export class PatientDetailPage implements OnInit {
  readonly patient = signal<Patient | null>(null);
  readonly appointments = signal<Appointment[]>([]);
  readonly measurements = signal<BodyMeasurement[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor(
    private readonly route: ActivatedRoute,
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

  appointmentStatusLabel = appointmentStatusLabel;
  patientStatusLabel = patientStatusLabel;
}
