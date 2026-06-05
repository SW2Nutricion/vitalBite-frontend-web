import { Component, Input, OnChanges, OnInit, SimpleChanges, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AnthropometryMeasurement,
  BodyComposition,
  BodyMeasurement,
  Patient,
} from '../../../core/models/vitalbite.models';
import { AnthropometryService } from '../../../core/services/anthropometry.service';
import { BodyMeasurementsService } from '../../../core/services/body-measurements.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

type AnthropometryRegionKey =
  | 'neckCm'
  | 'chestThoraxCm'
  | 'rightArmCm'
  | 'leftArmCm'
  | 'rightForearmCm'
  | 'leftForearmCm'
  | 'waistCm'
  | 'abdomenCm'
  | 'hipCm'
  | 'rightThighCm'
  | 'leftThighCm'
  | 'rightCalfCm'
  | 'leftCalfCm';

type AnthropometryRegion = {
  key: AnthropometryRegionKey;
  label: string;
  side: 'left' | 'right' | 'center';
  positionClass: string;
  calloutClass: string;
};

const REGIONS: AnthropometryRegion[] = [
  { key: 'neckCm', label: 'Cuello', side: 'left', positionClass: 'neck', calloutClass: 'neck' },
  { key: 'chestThoraxCm', label: 'Pecho / Tórax', side: 'left', positionClass: 'chest', calloutClass: 'chest' },
  { key: 'leftArmCm', label: 'Brazo Izquierdo', side: 'left', positionClass: 'left-arm', calloutClass: 'left-arm' },
  { key: 'waistCm', label: 'Cintura', side: 'left', positionClass: 'waist', calloutClass: 'waist' },
  { key: 'abdomenCm', label: 'Abdomen', side: 'left', positionClass: 'abdomen', calloutClass: 'abdomen' },
  { key: 'hipCm', label: 'Cadera', side: 'left', positionClass: 'hip', calloutClass: 'hip' },
  {
    key: 'leftForearmCm',
    label: 'Antebrazo Izquierdo',
    side: 'left',
    positionClass: 'left-forearm',
    calloutClass: 'left-forearm',
  },
  {
    key: 'leftThighCm',
    label: 'Muslo Izquierdo',
    side: 'left',
    positionClass: 'left-thigh',
    calloutClass: 'left-thigh',
  },
  {
    key: 'leftCalfCm',
    label: 'Pantorrilla Izquierda',
    side: 'left',
    positionClass: 'left-calf',
    calloutClass: 'left-calf',
  },
  {
    key: 'rightArmCm',
    label: 'Brazo Derecho',
    side: 'right',
    positionClass: 'right-arm',
    calloutClass: 'right-arm',
  },
  {
    key: 'rightForearmCm',
    label: 'Antebrazo Derecho',
    side: 'right',
    positionClass: 'right-forearm',
    calloutClass: 'right-forearm',
  },
  {
    key: 'rightThighCm',
    label: 'Muslo Derecho',
    side: 'right',
    positionClass: 'right-thigh',
    calloutClass: 'right-thigh',
  },
  {
    key: 'rightCalfCm',
    label: 'Pantorrilla Derecha',
    side: 'right',
    positionClass: 'right-calf',
    calloutClass: 'right-calf',
  },
];

@Component({
  selector: 'app-anthropometry-panel',
  imports: [ReactiveFormsModule, ModalComponent],
  templateUrl: './anthropometry-panel.component.html',
})
export class AnthropometryPanelComponent implements OnInit, OnChanges {
  @Input() patientId: string | null = null;
  @Input() patient: Patient | null = null;

  private readonly fb = inject(FormBuilder);
  private readonly anthropometryService = inject(AnthropometryService);
  private readonly bodyMeasurementsService = inject(BodyMeasurementsService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly success = signal('');
  readonly anthropometry = signal<AnthropometryMeasurement[]>([]);
  readonly measurements = signal<BodyMeasurement[]>([]);
  readonly compositions = signal<BodyComposition[]>([]);
  readonly selectedMeasurementId = signal<string | null>(null);
  readonly selectedRegion = signal<AnthropometryRegionKey>('waistCm');
  readonly editorOpen = signal(false);
  readonly deleteOpen = signal(false);
  readonly editingMeasurementId = signal<string | null>(null);
  readonly formError = signal('');
  readonly regions = REGIONS;
  readonly leftRegions = REGIONS.filter((region) => region.side === 'left');
  readonly rightRegions = REGIONS.filter((region) => region.side === 'right');
  readonly selectedRegionMeta = computed(
    () => this.regions.find((region) => region.key === this.selectedRegion()) ?? this.regions[0],
  );

  readonly selectedMeasurement = computed(
    () =>
      this.anthropometry().find((measurement) => measurement.id === this.selectedMeasurementId()) ??
      this.anthropometry()[0] ??
      null,
  );
  readonly latestAnthropometry = computed(() => this.anthropometry()[0] ?? null);
  readonly latestMeasurement = computed(() => this.measurements()[0] ?? null);
  readonly latestComposition = computed(() => this.compositions()[0] ?? null);
  readonly selectedRegionInfo = computed(() => {
    const region = this.selectedRegionMeta();
    const measurement = this.selectedMeasurement();
    const value = measurement ? measurement[region.key] : null;

    return {
      label: region.label,
      value: typeof value === 'number' ? value : null,
      measuredAt: measurement?.measuredAt ?? null,
    };
  });
  readonly latestRegionRows = computed(() =>
    this.regions.map((region) => {
      const latestRecord = this.anthropometry().find((measurement) => typeof measurement[region.key] === 'number');
      return {
        ...region,
        value: latestRecord ? latestRecord[region.key] : null,
        measuredAt: latestRecord?.measuredAt ?? null,
      };
    }),
  );
  readonly selectedMeasurementDate = computed(
    () => this.selectedMeasurement()?.measuredAt ?? null,
  );
  readonly selectedTooltipClass = computed(
    () => `tooltip-${this.selectedRegionMeta().calloutClass}`,
  );

  readonly form = this.fb.nonNullable.group({
    measuredAt: [this.today(), Validators.required],
    neckCm: [''],
    chestThoraxCm: [''],
    rightArmCm: [''],
    leftArmCm: [''],
    rightForearmCm: [''],
    leftForearmCm: [''],
    waistCm: [''],
    abdomenCm: [''],
    hipCm: [''],
    rightThighCm: [''],
    leftThighCm: [''],
    rightCalfCm: [''],
    leftCalfCm: [''],
  });

  async ngOnInit() {
    await this.loadPanel();
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['patientId'] && !changes['patientId'].firstChange) {
      await this.loadPanel();
    }
  }

  async loadPanel(preferredMeasurementId?: string | null) {
    if (!this.patientId) {
      this.loading.set(false);
      this.error.set('Selecciona un paciente para revisar su antropometría.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    try {
      const [anthropometry, measurements, compositions] = await Promise.all([
        this.anthropometryService.byPatient(this.patientId),
        this.bodyMeasurementsService.byPatient(this.patientId).catch(() => []),
        this.bodyMeasurementsService.compositions(this.patientId).catch(() => []),
      ]);

      this.anthropometry.set(anthropometry);
      this.measurements.set(measurements);
      this.compositions.set(compositions);
      this.selectedMeasurementId.set(preferredMeasurementId ?? anthropometry[0]?.id ?? null);
    } catch {
      this.error.set('No se pudo cargar la información de antropometría.');
      this.anthropometry.set([]);
      this.measurements.set([]);
      this.compositions.set([]);
      this.selectedMeasurementId.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  openCreate() {
    this.success.set('');
    this.formError.set('');
    this.editingMeasurementId.set(null);
    this.form.reset({
      measuredAt: this.today(),
      neckCm: '',
      chestThoraxCm: '',
      rightArmCm: '',
      leftArmCm: '',
      rightForearmCm: '',
      leftForearmCm: '',
      waistCm: '',
      abdomenCm: '',
      hipCm: '',
      rightThighCm: '',
      leftThighCm: '',
      rightCalfCm: '',
      leftCalfCm: '',
    });
    this.editorOpen.set(true);
  }

  openEdit() {
    const measurement = this.selectedMeasurement();
    if (!measurement) return;

    this.success.set('');
    this.formError.set('');
    this.editingMeasurementId.set(measurement.id);
    this.form.reset({
      measuredAt: this.dateInputValue(measurement.measuredAt),
      neckCm: this.stringValue(measurement.neckCm),
      chestThoraxCm: this.stringValue(measurement.chestThoraxCm),
      rightArmCm: this.stringValue(measurement.rightArmCm),
      leftArmCm: this.stringValue(measurement.leftArmCm),
      rightForearmCm: this.stringValue(measurement.rightForearmCm),
      leftForearmCm: this.stringValue(measurement.leftForearmCm),
      waistCm: this.stringValue(measurement.waistCm),
      abdomenCm: this.stringValue(measurement.abdomenCm),
      hipCm: this.stringValue(measurement.hipCm),
      rightThighCm: this.stringValue(measurement.rightThighCm),
      leftThighCm: this.stringValue(measurement.leftThighCm),
      rightCalfCm: this.stringValue(measurement.rightCalfCm),
      leftCalfCm: this.stringValue(measurement.leftCalfCm),
    });
    this.editorOpen.set(true);
  }

  openDelete() {
    if (!this.selectedMeasurement()) return;
    this.success.set('');
    this.deleteOpen.set(true);
  }

  async save() {
    if (!this.patientId || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      patientId: this.patientId,
      bodyMeasurementId:
        this.editingMeasurementId()
          ? this.selectedMeasurement()?.bodyMeasurementId ?? this.latestMeasurement()?.id ?? null
          : this.latestMeasurement()?.id ?? null,
      measuredAt: new Date(raw.measuredAt).toISOString(),
      neckCm: this.numberOrNull(raw.neckCm),
      chestThoraxCm: this.numberOrNull(raw.chestThoraxCm),
      rightArmCm: this.numberOrNull(raw.rightArmCm),
      leftArmCm: this.numberOrNull(raw.leftArmCm),
      rightForearmCm: this.numberOrNull(raw.rightForearmCm),
      leftForearmCm: this.numberOrNull(raw.leftForearmCm),
      waistCm: this.numberOrNull(raw.waistCm),
      abdomenCm: this.numberOrNull(raw.abdomenCm),
      hipCm: this.numberOrNull(raw.hipCm),
      rightThighCm: this.numberOrNull(raw.rightThighCm),
      leftThighCm: this.numberOrNull(raw.leftThighCm),
      rightCalfCm: this.numberOrNull(raw.rightCalfCm),
      leftCalfCm: this.numberOrNull(raw.leftCalfCm),
    };

    if (!this.hasAnyPerimeter(payload)) {
      this.formError.set('Registra al menos un perímetro corporal para guardar la medición.');
      return;
    }

    this.formError.set('');

    const measurement = this.editingMeasurementId()
      ? await this.anthropometryService.update(this.editingMeasurementId()!, payload)
      : await this.anthropometryService.create(payload);

    this.editorOpen.set(false);
    this.editingMeasurementId.set(null);
    this.success.set(
      this.selectedMeasurementId() && this.selectedMeasurementId() === measurement.id
        ? 'Medición actualizada correctamente.'
        : 'Medición registrada correctamente.',
    );
    await this.loadPanel(measurement.id);
  }

  async deleteSelected() {
    const measurement = this.selectedMeasurement();
    if (!measurement) return;

    await this.anthropometryService.delete(measurement.id);
    this.deleteOpen.set(false);
    this.success.set('Medición eliminada correctamente.');
    await this.loadPanel();
  }

  selectMeasurement(measurementId: string) {
    this.selectedMeasurementId.set(measurementId);
  }

  selectRegion(regionKey: AnthropometryRegionKey) {
    this.selectedRegion.set(regionKey);
  }

  isSelectedRegion(regionKey: AnthropometryRegionKey) {
    return this.selectedRegion() === regionKey;
  }

  isSelectedMeasurement(measurementId: string) {
    return this.selectedMeasurement()?.id === measurementId;
  }

  formatDate(value?: string | null) {
    if (!value) return 'Sin fecha';
    return new Intl.DateTimeFormat('es-BO', {
      dateStyle: 'medium',
    }).format(new Date(value));
  }

  formatShortDate(value?: string | null) {
    if (!value) return 'Sin fecha';
    return new Intl.DateTimeFormat('es-BO', {
      day: '2-digit',
      month: 'short',
    }).format(new Date(value));
  }

  formatMetric(value?: number | null, suffix = '') {
    if (typeof value !== 'number') return 'N/D';

    const digits = Number.isInteger(value) ? 0 : 1;
    return `${new Intl.NumberFormat('es-BO', {
      minimumFractionDigits: digits,
      maximumFractionDigits: 1,
    }).format(value)}${suffix}`;
  }

  historyMeasurementCount(measurement: AnthropometryMeasurement) {
    return this.regions.filter((region) => typeof measurement[region.key] === 'number').length;
  }

  private hasAnyPerimeter(payload: Record<string, unknown>) {
    return this.regions.some((region) => typeof payload[region.key] === 'number');
  }

  private numberOrNull(value: string) {
    if (!value?.trim()) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private stringValue(value?: number | null) {
    return typeof value === 'number' ? String(value) : '';
  }

  private dateInputValue(value: string) {
    return value.slice(0, 10);
  }

  private today() {
    return new Date().toISOString().slice(0, 10);
  }
}
