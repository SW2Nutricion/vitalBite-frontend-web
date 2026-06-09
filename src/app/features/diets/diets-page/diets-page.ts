import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  LucideDownload,
  LucideFilter,
  LucidePlus,
  LucideSearch,
  LucideShieldCheck,
  LucideUtensils,
  LucideXCircle,
} from '@lucide/angular';
import { DietPlan, DietPlanStatus, Patient } from '../../../core/models/vitalbite.models';
import { DietsService } from '../../../core/services/diets.service';
import { PatientsService } from '../../../core/services/patients.service';
import { SessionService } from '../../../core/services/session.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

type DietTab = 'ALL' | 'ACTIVE' | 'DRAFT' | 'EXPIRING';

const WEEK_DAYS = [
  'Lunes',
  'Martes',
  'Miercoles',
  'Jueves',
  'Viernes',
  'Sabado',
  'Domingo',
];

const BASE_MEALS = [
  { time: '08:00', name: 'Desayuno', targetCalories: 420 },
  { time: '12:30', name: 'Almuerzo', targetCalories: 560 },
  { time: '16:30', name: 'Merienda', targetCalories: 200 },
  { time: '20:00', name: 'Cena', targetCalories: 390 },
];

@Component({
  selector: 'app-diets-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ModalComponent,
    LucideDownload,
    LucideFilter,
    LucidePlus,
    LucideSearch,
    LucideShieldCheck,
    LucideUtensils,
    LucideXCircle,
  ],
  templateUrl: './diets-page.html',
  styleUrl: './diets-page.scss',
})
export class DietsPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly patientId = signal<string | null>(null);
  readonly patients = signal<Patient[]>([]);
  readonly patient = signal<Patient | null>(null);
  readonly diets = signal<DietPlan[]>([]);
  readonly selectedDietId = signal<string | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly successMessage = signal('');
  readonly actionError = signal('');
  readonly modalOpen = signal(false);
  readonly activeDietTab = signal<DietTab>('ALL');

  readonly filters = this.fb.nonNullable.group({
    search: [''],
  });

  readonly createForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    objective: ['', Validators.required],
    startDate: [this.today(), Validators.required],
    endDate: ['', Validators.required],
    phase: [''],
    approach: [''],
    mealsPerDay: [4, [Validators.required, Validators.min(1)]],
    mainRestriction: [''],
    notes: [''],
  });

  readonly filteredDiets = computed(() => {
    const search = this.filters.controls.search.value.trim().toLowerCase();
    const tab = this.activeDietTab();
    return this.diets().filter((diet) => {
      const matchesSearch =
        !search ||
        [diet.name, diet.objective, diet.phase, diet.approach]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(search));
      const matchesTab =
        tab === 'ALL' ||
        (tab === 'EXPIRING' && this.expiresSoon(diet)) ||
        (tab !== 'EXPIRING' && diet.status === tab);
      return matchesSearch && matchesTab;
    });
  });

  readonly selectedDiet = computed<DietPlan | null>(
    () => this.diets().find((diet) => diet.id === this.selectedDietId()) ?? this.diets()[0] ?? null,
  );

  readonly activeCount = computed(
    () => this.diets().filter((diet) => diet.status === 'ACTIVE').length,
  );

  readonly draftCount = computed(() => this.diets().filter((diet) => diet.status === 'DRAFT').length);

  readonly expiringCount = computed(() => this.diets().filter((diet) => this.expiresSoon(diet)).length);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly dietsService: DietsService,
    private readonly patientsService: PatientsService,
    readonly session: SessionService,
  ) {}

  async ngOnInit() {
    this.patientId.set(this.route.snapshot.paramMap.get('id'));
    await this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const patientId = this.patientId();
      if (!patientId) {
        this.patients.set(await this.patientsService.list());
        return;
      }

      const [patient, diets] = await Promise.all([
        this.patientsService.byId(patientId),
        this.dietsService.byPatient(patientId),
      ]);
      this.patient.set(patient);
      this.diets.set(diets);
      this.selectedDietId.set(diets[0]?.id ?? null);
    } catch {
      this.error.set('No se pudo cargar los planes alimenticios.');
    } finally {
      this.loading.set(false);
    }
  }

  async createDiet() {
    const patient = this.patient();
    if (!patient || this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      this.actionError.set('Completa los datos obligatorios del plan.');
      return;
    }

    this.clearActionMessages();
    this.saving.set(true);
    const raw = this.createForm.getRawValue();
    try {
      const diet = await this.dietsService.create({
        patientId: patient.id,
        nutritionistId: this.session.user()?.id ?? patient.nutritionistId,
        name: raw.name,
        objective: raw.objective,
        startDate: new Date(raw.startDate).toISOString(),
        endDate: new Date(raw.endDate).toISOString(),
        phase: raw.phase,
        approach: raw.approach,
        status: 'DRAFT',
        mealsPerDay: Number(raw.mealsPerDay),
        mainRestriction: raw.mainRestriction,
        notes: raw.notes,
        days: this.initialStructure(Number(raw.mealsPerDay)),
      });

      this.modalOpen.set(false);
      await this.load();
      this.selectedDietId.set(diet.id);
      this.successMessage.set('Plan alimenticio creado y asociado al expediente.');
    } catch {
      this.actionError.set('No se pudo crear el plan. Revisa los datos e intenta nuevamente.');
    } finally {
      this.saving.set(false);
    }
  }

  selectDiet(diet: DietPlan) {
    this.selectedDietId.set(diet.id);
  }

  openCreateModal() {
    this.clearActionMessages();
    this.modalOpen.set(true);
  }

  closeCreateModal() {
    this.actionError.set('');
    this.modalOpen.set(false);
  }

  formatDate(value?: string | null) {
    if (!value) return 'Sin fecha';
    return new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }).format(
      new Date(value),
    );
  }

  statusLabel(status: DietPlanStatus) {
    if (status === 'ACTIVE') return 'Activo';
    if (status === 'DRAFT') return 'Pendiente';
    return 'Ajustar';
  }

  statusClass(status: DietPlanStatus) {
    if (status === 'DRAFT') return 'warning';
    if (status === 'NEEDS_ADJUSTMENT') return 'danger';
    return '';
  }

  expiresSoon(diet: DietPlan) {
    if (!diet.endDate) return false;
    const diffDays = Math.ceil((new Date(diet.endDate).getTime() - Date.now()) / 86_400_000);
    return diffDays >= 0 && diffDays <= 14;
  }

  private initialStructure(mealsPerDay: number) {
    const baseMeals = BASE_MEALS.slice(0, Math.max(1, mealsPerDay));

    return WEEK_DAYS.map((dayLabel, dayIndex) => ({
      dayLabel,
      dayOrder: dayIndex + 1,
      meals: baseMeals.map((meal, index) => ({
        name: meal.name,
        notes: meal.time,
        targetCalories: meal.targetCalories,
        mealOrder: index + 1,
        items: [],
      })),
    }));
  }

  private today() {
    return new Date().toISOString().slice(0, 10);
  }

  private clearActionMessages() {
    this.successMessage.set('');
    this.actionError.set('');
  }
}
