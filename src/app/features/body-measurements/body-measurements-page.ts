import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideClipboardList, LucideDroplet, LucidePlus, LucideRuler, LucideWeight } from '@lucide/angular';
import {
  BodyComposition,
  BodyMeasurement,
  Patient,
} from '../../core/models/vitalbite.models';
import { BodyMeasurementsService } from '../../core/services/body-measurements.service';
import { PatientsService } from '../../core/services/patients.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';

@Component({
  selector: 'app-body-measurements-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ModalComponent,
    LucideArrowLeft,
    LucideClipboardList,
    LucideDroplet,
    LucidePlus,
    LucideRuler,
    LucideWeight,
  ],
  templateUrl: './body-measurements-page.html',
})
export class BodyMeasurementsPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly patient = signal<Patient | null>(null);
  readonly selectedPatientId = signal('');
  readonly measurements = signal<BodyMeasurement[]>([]);
  readonly compositions = signal<BodyComposition[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly measurementModal = signal(false);
  readonly compositionModal = signal(false);

  readonly selectedPatient = computed<Patient | null>(() => this.patient());
  readonly latestMeasurement = computed<BodyMeasurement | null>(() => this.measurements()[0] ?? null);
  readonly latestComposition = computed<BodyComposition | null>(() => this.compositions()[0] ?? null);

  readonly measurementForm = this.fb.nonNullable.group({
    measuredAt: [this.today(), Validators.required],
    weightKg: [70, [Validators.required, Validators.min(0.1)]],
    heightCm: [165],
    waistCm: [80],
    hipCm: [96],
  });

  readonly compositionForm = this.fb.nonNullable.group({
    bodyFatPercentage: [30],
    muscleMassKg: [42],
    waterPercentage: [49],
    visceralFatLevel: [7],
    boneMassKg: [2.5],
    metabolicAge: [35],
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly patientsService: PatientsService,
    private readonly measurementsService: BodyMeasurementsService,
  ) {}

  async ngOnInit() {
    await this.loadPatient();
  }

  async loadPatient() {
    this.loading.set(true);
    this.error.set('');
    try {
      const patientId = this.route.snapshot.paramMap.get('id');
      if (!patientId) {
        this.error.set('Selecciona un paciente para revisar sus medidas.');
        return;
      }

      const patient = await this.patientsService.byId(patientId);
      this.patient.set(patient);
      this.selectedPatientId.set(patient.id);
      await this.loadMeasurements();
    } catch {
      this.error.set('No se pudo cargar la evolución corporal.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadMeasurements() {
    const patientId = this.selectedPatientId();
    if (!patientId) return;
    const [measurements, compositions] = await Promise.all([
      this.measurementsService.byPatient(patientId),
      this.measurementsService.compositions(patientId).catch(() => []),
    ]);
    this.measurements.set(measurements);
    this.compositions.set(compositions);
  }

  async createMeasurement() {
    if (this.measurementForm.invalid || !this.selectedPatientId()) {
      this.measurementForm.markAllAsTouched();
      return;
    }
    const raw = this.measurementForm.getRawValue();
    await this.measurementsService.createMeasurement({
      patientId: this.selectedPatientId(),
      measuredAt: new Date(raw.measuredAt).toISOString(),
      weightKg: Number(raw.weightKg),
      heightCm: Number(raw.heightCm) || null,
      waistCm: Number(raw.waistCm) || null,
      hipCm: Number(raw.hipCm) || null,
    });
    this.measurementModal.set(false);
    await this.loadMeasurements();
  }

  async createComposition() {
    const latest = this.latestMeasurement();
    if (!latest || !this.selectedPatientId()) return;
    const raw = this.compositionForm.getRawValue();
    await this.measurementsService.createComposition({
      patientId: this.selectedPatientId(),
      bodyMeasurementId: latest.id,
      measuredAt: latest.measuredAt,
      bodyFatPercentage: Number(raw.bodyFatPercentage) || null,
      muscleMassKg: Number(raw.muscleMassKg) || null,
      waterPercentage: Number(raw.waterPercentage) || null,
      visceralFatLevel: Number(raw.visceralFatLevel) || null,
      boneMassKg: Number(raw.boneMassKg) || null,
      metabolicAge: Number(raw.metabolicAge) || null,
    });
    this.compositionModal.set(false);
    await this.loadMeasurements();
  }

  formatDate(value?: string | null) {
    if (!value) return 'Sin fecha';
    return new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short' }).format(new Date(value));
  }

  barHeight(measurement: BodyMeasurement) {
    return Math.max(40, measurement.weightKg * 1.5);
  }

  private today() {
    return new Date().toISOString().slice(0, 10);
  }
}
