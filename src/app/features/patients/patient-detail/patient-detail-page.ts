import { Component, OnInit, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideActivity,
  LucideAlertTriangle,
  LucideArrowLeft,
  LucidePencil,
  LucideFile,
  LucideFileText,
  LucideDownload,
  LucideBrainCircuit,
  LucideSparkles
} from '@lucide/angular';
import { AppointmentsCalendarComponent } from '../../appointments/appointments-calendar/appointments-calendar.component';
import { AnthropometryPanelComponent } from '../anthropometry/anthropometry-panel.component';
import {
  Appointment,
  BodyMeasurement,
  Patient,
  PatientRiskPrediction,
} from '../../../core/models/vitalbite.models';
import { AppointmentsService } from '../../../core/services/appointments.service';
import { BodyMeasurementsService } from '../../../core/services/body-measurements.service';
import { PatientsService } from '../../../core/services/patients.service';
import { RiskPredictionsService } from '../../../core/services/risk-predictions.service';

@Component({
  selector: 'app-patient-detail-page',
  imports: [
    RouterLink,
    LucideActivity,
    LucideAlertTriangle,
    LucideArrowLeft,
    LucidePencil,
    LucideFile,
    LucideFileText,
    LucideDownload,
    LucideBrainCircuit,
    LucideSparkles,
    DatePipe,
    AppointmentsCalendarComponent,
    AnthropometryPanelComponent,
  ],
  templateUrl: './patient-detail-page.html',
})
export class PatientDetailPage implements OnInit {
  readonly patient = signal<Patient | null>(null);
  readonly appointments = signal<Appointment[]>([]);
  readonly measurements = signal<BodyMeasurement[]>([]);
  readonly riskPrediction = signal<PatientRiskPrediction | null>(null);
  readonly riskLoading = signal(false);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly tabs = ['Resumen', 'Citas', 'Antropometría', 'Dietas', 'Documentos'];
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
    private readonly riskPredictionsService: RiskPredictionsService,
  ) {}

  async ngOnInit() {
    const requestedTab = this.route.snapshot.queryParamMap.get('tab');
    if (requestedTab && this.tabs.includes(requestedTab)) {
      this.activeTab.set(requestedTab);
    }

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
      void this.loadRiskPrediction(id);
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
    const today = new Date();
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
    return birthDate ? this.birthDateText(birthDate) : 'Sin registro';
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

  riskLevelClass() {
    const level = this.riskPrediction()?.nivelRiesgo?.toLowerCase();
    if (level === 'alto') return 'high';
    if (level === 'medio') return 'medium';
    if (level === 'bajo') return 'low';
    return 'neutral';
  }

  riskProbabilityLabel() {
    const probability = this.riskPrediction()?.probabilidad;
    if (probability === null || probability === undefined) return 'N/D';
    return `${Math.round(probability * 100)}%`;
  }

  riskProbability() {
    const probability = this.riskPrediction()?.probabilidad;
    if (probability === null || probability === undefined) return 0;
    return Math.round(probability * 100);
  }

  riskUpdatedLabel() {
    const createdAt = this.riskPrediction()?.createdAt;
    return createdAt ? this.compactDate(createdAt) : 'Sin registro';
  }

  async setActiveTab(tab: string) {
    if (tab === 'Dietas' && this.patient()?.id) {
      await this.router.navigate(['/patients', this.patient()!.id, 'diets']);
      return;
    }

    this.activeTab.set(tab);
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        tab: tab === 'Resumen' ? null : tab,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private birthDateText(value: string) {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    return new Intl.DateTimeFormat('es-BO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  }

  private async loadRiskPrediction(patientId: string) {
    this.riskLoading.set(true);
    this.riskPrediction.set(null);

    try {
      const prediction = await this.riskPredictionsService.byPatient(patientId);
      this.riskPrediction.set(prediction);
    } catch {
      this.riskPrediction.set({
        status: 'UNAVAILABLE',
        factoresCriticos: [],
      });
    } finally {
      this.riskLoading.set(false);
    }
  }
}
